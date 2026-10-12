import { describe, expect, it } from 'vitest'
import { keepLoginFields } from '@/collections/Passkeys'

// フックは data と operation しか見ないので、ほかの引数は省く
const run = (data: Record<string, unknown>, operation: 'create' | 'update') =>
  (
    keepLoginFields as unknown as (args: {
      data: Record<string, unknown>
      operation: string
    }) => Record<string, unknown>
  )({
    data: { ...data },
    operation,
  })

describe('パスキーの更新（管理画面での名前の変更など）', () => {
  const row = { name: 'iPhone', counter: 3, backedUp: true, lastUsedAt: '2026-10-12T00:00:00.000Z' }

  it('更新では、ログインのときに進める項目（使用回数・同期・最後に使った日時）を書かない', () => {
    expect(run(row, 'update')).toEqual({ name: 'iPhone' })
  })

  it('作成のときはそのまま', () => {
    expect(run(row, 'create')).toEqual(row)
  })
})
