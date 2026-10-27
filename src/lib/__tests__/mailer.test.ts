import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const SMTP_KEYS = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'] as const

// mailer.ts は読み込み時に環境変数を見るので、ケースごとにモジュールを読み直す
const load = async () => {
  vi.resetModules()
  return import('../mailer')
}

const makePayload = () => {
  const logger = { warn: vi.fn(), info: vi.fn() }
  return { logger, payload: { logger } as never }
}

describe('smtpEmailAdapter', () => {
  const saved: Record<string, string | undefined> = {}

  beforeEach(() => {
    for (const k of SMTP_KEYS) {
      saved[k] = process.env[k]
      delete process.env[k]
    }
  })

  afterEach(() => {
    for (const k of SMTP_KEYS) {
      if (saved[k] === undefined) delete process.env[k]
      else process.env[k] = saved[k]
    }
  })

  it('SMTP 未設定: 初期化では何も出さず、送ろうとした時だけ警告して成功扱いにする', async () => {
    const { isSmtpConfigured, smtpTransport, smtpEmailAdapter } = await load()
    expect(isSmtpConfigured).toBe(false)
    expect(smtpTransport).toBeNull()

    const { logger, payload } = makePayload()
    const adapter = smtpEmailAdapter({ payload })
    expect(logger.warn).not.toHaveBeenCalled()

    await expect(adapter.sendEmail({ to: 'a@example.com', subject: '件名' })).resolves.toBeUndefined()
    expect(logger.warn).toHaveBeenCalledTimes(1)
    expect(String(logger.warn.mock.calls[0][0])).toContain('件名')
  })

  it('SMTP の一部だけ設定: 未設定扱い（半端な接続情報で送りに行かない）', async () => {
    Object.assign(process.env, { SMTP_HOST: 'smtp.example.com', SMTP_PORT: '587', SMTP_USER: 'me@example.com' })
    const { isSmtpConfigured, smtpTransport } = await load()
    expect(isSmtpConfigured).toBe(false)
    expect(smtpTransport).toBeNull()
  })

  it('.env.example のまま空文字: 未設定扱い', async () => {
    Object.assign(process.env, { SMTP_HOST: '', SMTP_PORT: '', SMTP_USER: '', SMTP_PASS: '' })
    const { isSmtpConfigured, smtpTransport } = await load()
    expect(isSmtpConfigured).toBe(false)
    expect(smtpTransport).toBeNull()
  })

  it.each(['abc', '0', '-1', '587.5', '70000', '1e3', '0x24b', ' '])('ポートが %j: 未設定扱い', async (port) => {
    Object.assign(process.env, { SMTP_HOST: 'smtp.example.com', SMTP_PORT: port, SMTP_USER: 'me@example.com', SMTP_PASS: 'pw' })
    const { isSmtpConfigured } = await load()
    expect(isSmtpConfigured).toBe(false)
  })

  it('値の前後の空白・改行は取り除く（パスワードは変えない）', async () => {
    Object.assign(process.env, {
      SMTP_HOST: ' smtp.example.com\n',
      SMTP_PORT: '587\n',
      SMTP_USER: 'me@example.com\n',
      SMTP_PASS: 'p w',
    })
    const { isSmtpConfigured, smtpFromAddress } = await load()
    expect(isSmtpConfigured).toBe(true)
    expect(smtpFromAddress).toBe('me@example.com')
  })

  it('SMTP 設定済み: 送信元を補ってトランスポートへ渡し、指定された from は上書きしない', async () => {
    Object.assign(process.env, { SMTP_HOST: 'smtp.example.com', SMTP_PORT: '587', SMTP_USER: 'me@example.com', SMTP_PASS: 'pw' })
    const { isSmtpConfigured, smtpTransport, smtpEmailAdapter } = await load()
    expect(isSmtpConfigured).toBe(true)
    expect(smtpTransport).not.toBeNull()

    const sendMail = vi.spyOn(smtpTransport!, 'sendMail').mockResolvedValue({} as never)
    const { payload } = makePayload()
    const adapter = smtpEmailAdapter({ payload })
    expect(adapter.defaultFromAddress).toBe('me@example.com')

    await adapter.sendEmail({ to: 'y@example.com', subject: 's' })
    expect(sendMail).toHaveBeenLastCalledWith(
      expect.objectContaining({ to: 'y@example.com', from: '"ポートフォリオ" <me@example.com>' }),
    )

    await adapter.sendEmail({ to: 'y@example.com', subject: 's', from: 'custom@example.com' })
    expect(sendMail).toHaveBeenLastCalledWith(expect.objectContaining({ from: 'custom@example.com' }))
  })
})
