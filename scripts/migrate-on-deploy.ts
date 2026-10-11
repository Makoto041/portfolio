// scripts/migrate-on-deploy.ts
// 本番デプロイ（Vercel の Production）のビルドの最初に、未適用の DB マイグレーションを適用する。
// vercel.json の buildCommand から `pnpm run migrate:deploy`（payload run）で呼ばれ、続けて next build が走る。
// - Vercel の Production のビルドだけで適用し、Preview・development では何もしない。VERCEL_ENV が無ければ止める
//   （src/lib/deployMigrate.ts。ローカルの pnpm build はこのスクリプトを通らない）
// - dev mode でスキーマを直接書き換えた記録（batch -1）があれば、適用せずに止める（データが消える確認を自動で通さない）
// - 適用は Payload の migrate と同じ処理（1件ずつトランザクション。失敗したらその1件は戻る）
// - 最後に src/migrations の全件が適用済みかを確かめ、残っていれば止める
// 止めると（終了コード 1）ビルドが失敗し、そのデプロイは公開されない。今の本番はそのまま動き続ける。
// 本番ビルドが同時に2つ走ると片方が失敗することがある。そのときは再デプロイすればよい（適用済みは飛ばす）
import type { Migration } from 'payload'
import { hasDevPush, migrateDecision, pendingMigrations } from '../src/lib/deployMigrate'

const log = (message: string) => console.log(`migrate-on-deploy: ${message}`)
const fail = (message: string) => console.error(`migrate-on-deploy: ${message}`)

async function main(): Promise<number> {
  const decision = migrateDecision(process.env)
  if (!decision.run) {
    if (decision.fail) {
      fail(decision.reason)
      return 1
    }
    log(`skipped (${decision.reason})`)
    return 0
  }

  // 開発モードの自動 push（スキーマの直接書き換え）を止める（payload migrate と同じ）
  process.env.PAYLOAD_MIGRATING = 'true'
  const [{ default: payload }, { default: config }, { migrations }, { sql }] = await Promise.all([
    import('payload'),
    import('../src/payload.config'),
    import('../src/migrations'),
    import('@payloadcms/db-vercel-postgres'),
  ])
  // ログは同期で書く（失敗するとすぐ終了するので、非同期だと原因がビルドログに残らないことがある）
  const sanitized = await config
  await payload.init({ config: { ...sanitized, logger: 'sync' }, disableOnInit: true })

  // 記録の表（payload_migrations）がまだ無い DB（初めてのデプロイ）では、記録を空として扱う。
  // 表は最初のマイグレーションが作る（Payload の migrate も同じように、表の有無を見てから記録を読む）
  const recorded = async () => {
    const table = await payload.db.drizzle.execute(
      sql`SELECT to_regclass('payload_migrations') IS NOT NULL AS present`,
    )
    if (!table.rows[0]?.present) return []
    return (
      await payload.find({ collection: 'payload-migrations', limit: 0, pagination: false, depth: 0 })
    ).docs
  }
  const names = migrations.map((m) => m.name)

  const before = await recorded()
  if (hasDevPush(before)) {
    fail(
      'this database has schema changes pushed in dev mode (payload_migrations has batch -1). ' +
        'Applying migrations automatically could lose data, so the deploy stops here. Check it by hand.',
    )
    return 1
  }
  const pending = pendingMigrations(names, before)
  if (pending.length === 0) {
    log(`up to date (${names.length} migrations)`)
    return 0
  }

  log(`applying ${pending.join(', ')}`)
  // 失敗したときは Payload がその1件を巻き戻し、終了コード 1 で終わる。
  // Payload の型は up/down の引数を unknown にしているため合わせる（渡す中身は payload migrate と同じ）
  await payload.db.migrate({ migrations: migrations as unknown as Migration[] })

  const left = pendingMigrations(names, await recorded())
  if (left.length > 0) {
    fail(`still not applied: ${left.join(', ')}`)
    return 1
  }
  log(`applied ${pending.length} migration(s)`)
  return 0
}

let code = 1
try {
  code = await main()
} catch (error) {
  fail('failed')
  console.error(error)
}
process.exit(code)
