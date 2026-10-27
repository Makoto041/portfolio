import { describe, expect, it } from 'vitest'
import { Users } from '../../collections/Users'
import { SITE_URL } from '../siteUrl'

// Payload が渡す req のうち、フックが触る部分だけを模す
const fakeReq = (host: string) =>
  ({
    headers: new Headers({ host }),
    t: (key: string) => `[${key}]`,
    payload: { config: { routes: { admin: '/admin' }, admin: { routes: { reset: '/reset' } } } },
  }) as never

describe('Users の forgotPassword メール', () => {
  const generate = Users.auth && typeof Users.auth === 'object' ? Users.auth.forgotPassword?.generateEmailHTML : undefined

  it('再設定リンクのホストは Host ヘッダーではなく自サイトの URL', async () => {
    expect(generate).toBeTypeOf('function')
    const html = await generate!({ req: fakeReq('evil.example'), token: 'tok123' })
    expect(html).toContain(`${SITE_URL}/admin/reset/tok123`)
    expect(html).not.toContain('evil.example')
  })

  it('本文の文言は Payload の翻訳をそのまま使う', async () => {
    const html = await generate!({ req: fakeReq('example.com'), token: 'tok123' })
    expect(html).toContain('[authentication:youAreReceivingResetPassword]')
    expect(html).toContain('[authentication:youDidNotRequestPassword]')
  })

  it('req / token が無ければメールを作らずに失敗する', async () => {
    await expect(Promise.resolve().then(() => generate!({ token: 'tok123' }))).rejects.toThrow()
    await expect(Promise.resolve().then(() => generate!({ req: fakeReq('example.com') }))).rejects.toThrow()
  })
})
