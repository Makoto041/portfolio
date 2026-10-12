// scripts/migrate-on-deploy.ts
// 本番デプロイ（Vercel の Production）のビルドの最初に、未適用の DB マイグレーションを適用する。
// vercel.json の buildCommand から `pnpm run migrate:deploy`（payload run）で呼ばれ、続けて next build が走る。
// - Vercel の Production のビルドだけで適用し、Preview・development では何もしない。VERCEL_ENV が無ければ止める
//   （src/lib/deployMigrate.ts。ローカルの pnpm build はこのスクリプトを通らない）
// - 未適用が無ければ何もしない（dev mode の記録があっても止めない）
// - dev mode でスキーマを直接書き換えた記録（batch -1。PAYLOAD_DEV_PUSH=true の pnpm dev をその DB に向けて動かすと付く）があるときは、
//   未適用が全部「足すだけで、二度目も通る」形（src/migrations/<名前>.ts の up を isAdditiveMigration で確かめる）の
//   ときだけ当てる。1つでも違えば何も当てずに止める（データが消える確認を自動で通さない）
// - 適用は Payload の migrate と同じ手順（1件ずつトランザクション。失敗したらその1件は戻る）。
//   Payload の migrate は dev mode の記録があると確認を出し、ビルドでは答えられずに何もせず成功で終わるため、ここで行う
// - 最初の読み取りは、DB の起動待ちで時間切れになることがあるので3回まで試す
// - 最後に src/migrations の全件が適用済みかを確かめ、残っていれば止める
// 止めると（終了コード 1）ビルドが失敗し、そのデプロイは公開されない。今の本番はそのまま動き続ける。
// 本番ビルドが同時に2つ走ると片方が失敗することがある。そのときは再デプロイすればよい（適用済みは飛ばす）
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { MigrateUpArgs } from '@payloadcms/db-vercel-postgres'
import {
  hasDevPush,
  isAdditiveMigration,
  migrateDecision,
  nextBatch,
  pendingMigrations,
  planMigrations,
} from '../src/lib/deployMigrate'

const log = (message: string) => console.log(`migrate-on-deploy: ${message}`)
const fail = (message: string) => console.error(`migrate-on-deploy: ${message}`)

/** src/migrations/<名前>.ts の up が足すだけの形か（ビルドはリポジトリの直下で動く。読めなければ false） */
function additiveOnDisk(name: string): boolean {
  try {
    return isAdditiveMigration(
      readFileSync(join(process.cwd(), 'src/migrations', `${name}.ts`), 'utf8'),
    )
  } catch {
    return false
  }
}

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
  const [payloadModule, { default: config }, { migrations }, { sql }] = await Promise.all([
    import('payload'),
    import('../src/payload.config'),
    import('../src/migrations'),
    import('@payloadcms/db-vercel-postgres'),
  ])
  const {
    default: payload,
    commitTransaction,
    createLocalReq,
    initTransaction,
    killTransaction,
  } = payloadModule
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
      await payload.find({
        collection: 'payload-migrations',
        limit: 0,
        pagination: false,
        depth: 0,
      })
    ).docs
  }
  const names = migrations.map((m) => m.name)

  // 最初の読み取りは、眠っていた DB の起動待ち（Neon のコールドスタート）で接続が時間切れになることがあるので、
  // 少し待って3回まで試す（読むだけなので何度試しても DB は変わらない）
  const firstRead = async () => {
    for (let attempt = 1; ; attempt++) {
      try {
        return await recorded()
      } catch (error) {
        if (attempt >= 3) throw error
        const reason = error instanceof Error ? error.message : String(error)
        log(`could not read payload_migrations (${reason}); retrying in ${attempt * 3}s`)
        await new Promise((resolve) => setTimeout(resolve, attempt * 3000))
      }
    }
  }
  const before = await firstRead()
  const devPush = hasDevPush(before)
  log(
    `${before.length} record(s) in payload_migrations` +
      (devPush ? ', including a dev-mode push record (batch -1)' : '') +
      `; ${names.length} migration(s) in src/migrations`,
  )
  const plan = planMigrations(names, before, additiveOnDisk)
  if (plan.kind === 'none') {
    log(`up to date (${names.length} migrations)`)
    return 0
  }
  if (plan.kind === 'stop') {
    fail(plan.reason)
    return 1
  }
  if (plan.devPush) {
    log(
      'this database has schema changes pushed in dev mode, but the pending migrations only add tables, ' +
        'columns, indexes and constraints and skip what already exists, so they are applied',
    )
  }

  // Payload の migrate と同じ手順: 拡張の用意 → 1件ずつ「up → 記録」を1つのトランザクションで
  const adapter = payload.db as unknown as { createExtensions?: () => Promise<void> }
  if (typeof adapter.createExtensions === 'function') await adapter.createExtensions()
  const batch = nextBatch(before)
  log(`applying ${plan.pending.join(', ')} (batch ${batch})`)
  for (const migration of migrations) {
    if (!plan.pending.includes(migration.name)) continue
    const req = await createLocalReq({}, payload)
    try {
      await initTransaction(req)
      const id = req.transactionID ? await req.transactionID : undefined
      const db = (id !== undefined && payload.db.sessions?.[id]?.db) || payload.db.drizzle
      await migration.up({ db: db as unknown as MigrateUpArgs['db'], payload, req })
      await payload.create({
        collection: 'payload-migrations',
        data: { name: migration.name, batch },
        req,
      })
      await commitTransaction(req)
      log(`applied ${migration.name}`)
    } catch (error) {
      await killTransaction(req)
      fail(`${migration.name} failed and was rolled back, so the deploy stops here`)
      console.error(error)
      return 1
    }
  }

  const left = pendingMigrations(names, await recorded())
  if (left.length > 0) {
    fail(`still not applied: ${left.join(', ')}`)
    return 1
  }
  log(`applied ${plan.pending.length} migration(s)`)
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
