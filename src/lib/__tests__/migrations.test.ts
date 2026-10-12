import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

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
})
