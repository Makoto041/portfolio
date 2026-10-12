import { describe, expect, it } from 'vitest'
import { publishedMediaOnly } from '../access'

type Args = Parameters<typeof publishedMediaOnly>[0]
const call = (user: unknown) => publishedMediaOnly({ req: { user } } as unknown as Args)

describe('publishedMediaOnly', () => {
  it('ログイン中の管理者はすべての画像を読める', () => {
    expect(call({ id: 1 })).toBe(true)
  })

  it('ログインしていない人には、投稿待ち（pending）の写真を出さない（pending が空の行は公開扱い）', () => {
    expect(call(null)).toEqual({
      or: [{ pending: { equals: false } }, { pending: { exists: false } }],
    })
  })
})
