import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const ENV_KEYS = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM', 'CONTACT_NOTIFY_TO'] as const

// お問い合わせ通知のフック（afterChange）を、環境変数を変えて読み直しながら呼ぶ
const sendNotification = async () => {
  vi.resetModules()
  const { smtpTransport } = await import('../mailer')
  const { default: Letter } = await import('../../collections/Letters')
  const sendMail = vi.spyOn(smtpTransport!, 'sendMail').mockResolvedValue({} as never)
  const hook = Letter.hooks!.afterChange![0]
  await hook({ doc: { name: '太郎', message: 'こんにちは' }, operation: 'create' } as never)
  return sendMail
}

describe('お問い合わせ通知の宛先と送信元', () => {
  const saved: Record<string, string | undefined> = {}

  beforeEach(() => {
    for (const k of ENV_KEYS) {
      saved[k] = process.env[k]
      delete process.env[k]
    }
    Object.assign(process.env, {
      SMTP_HOST: 'smtp.example.com',
      SMTP_PORT: '587',
      SMTP_USER: 'me@example.com',
      SMTP_PASS: 'pw',
    })
  })

  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k]
      else process.env[k] = saved[k]
    }
  })

  it('SMTP_FROM を分けても、宛先の既定値は SMTP_USER のまま（送信元には届かない）', async () => {
    process.env.SMTP_FROM = 'no-reply@example.com'
    const sendMail = await sendNotification()
    expect(sendMail).toHaveBeenCalledTimes(1)
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'me@example.com', from: '"お問い合わせ通知" <no-reply@example.com>' }),
    )
  })

  it('CONTACT_NOTIFY_TO があればそれが宛先', async () => {
    process.env.CONTACT_NOTIFY_TO = 'admin@example.com'
    process.env.SMTP_FROM = 'no-reply@example.com'
    const sendMail = await sendNotification()
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: 'admin@example.com' }))
  })

  it('SMTP_FROM が無ければ、これまでどおり SMTP_USER が送信元と宛先', async () => {
    const sendMail = await sendNotification()
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'me@example.com', from: '"お問い合わせ通知" <me@example.com>' }),
    )
  })
})
