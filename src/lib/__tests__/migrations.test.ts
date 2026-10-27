import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { isAdditiveMigration } from '../deployMigrate'

// 本番デプロイの自動適用（scripts/migrate-on-deploy.ts）は src/migrations/index.ts の一覧を使う。
// 一覧に載っていないマイグレーションは本番で黙って飛ばされるので、ファイルと一覧が一致しているかを見る
describe('src/migrations/index.ts', () => {
  const dir = join(__dirname, '../../migrations')

  it('マイグレーションのファイルがすべて一覧に載っている', () => {
    const files = readdirSync(dir)
      .filter((f) => f.endsWith('.ts') && f !== 'index.ts')
      .map((f) => f.slice(0, -'.ts'.length))
      .sort()
    const index = readFileSync(join(dir, 'index.ts'), 'utf8')
    const listed = [...index.matchAll(/name: '([^']+)'/g)].map((m) => m[1]).sort()
    expect(listed).toEqual(files)
  })

  it('一覧は古い順に並んでいる（適用の順番）', () => {
    const index = readFileSync(join(dir, 'index.ts'), 'utf8')
    const listed = [...index.matchAll(/name: '([^']+)'/g)].map((m) => m[1])
    expect(listed).toEqual([...listed].sort())
  })

  // 本番の DB には dev mode の記録（batch -1）があるので、さっと投稿のマイグレーションは
  // 「足すだけで、二度目も通る」形でないと本番デプロイで当てられない（src/lib/deployMigrate.ts の planMigrations）
  it('さっと投稿・Payload 更新のマイグレーションは足すだけで、二度目も通る形', () => {
    for (const name of [
      '20261011_091225_quickpost',
      '20261011_234215_quickpost_receipt_digest',
      '20261012_000445_quickpost_pending_media',
      '20261027_144526_payload_3_92_upgrade',
    ]) {
      expect(isAdditiveMigration(readFileSync(join(dir, `${name}.ts`), 'utf8')), name).toBe(true)
    }
  })

  it('消す・書き換える・二度目に失敗する古いマイグレーションは、足すだけとはみなさない', () => {
    for (const name of [
      '20250517_093907_create_blogPosts', // IF NOT EXISTS の無い ADD COLUMN
      '20250706_074347_timeline_richtext_update', // UPDATE・DROP COLUMN・RENAME
      '20260705_031719_spotify_playlist', // IF NOT EXISTS の無い ADD COLUMN
    ]) {
      expect(isAdditiveMigration(readFileSync(join(dir, `${name}.ts`), 'utf8')), name).toBe(false)
    }
  })
})
