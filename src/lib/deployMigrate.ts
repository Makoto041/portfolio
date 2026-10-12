// src/lib/deployMigrate.ts
// 本番デプロイのビルドで DB マイグレーションを自動で適用するときの判定（scripts/migrate-on-deploy.ts から使う）。

export type MigrateDecision = { run: true } | { run: false; reason: string; fail: boolean }

/**
 * このビルドで適用するか。Vercel の Production のビルドだけで適用し、Preview・development のビルドでは何もしない。
 * VERCEL_ENV が無い・知らない値のときは、本番かどうか分からないので止める（黙って飛ばさない）。
 * Vercel の「System Environment Variables を公開する」設定が切れていると VERCEL も VERCEL_ENV も無くなるため、
 * 「Vercel の外」とみなして飛ばすことはしない（scripts/migrate-on-deploy.ts は Vercel のビルドコマンドからだけ呼ぶ）
 */
export function migrateDecision(env: Record<string, string | undefined>): MigrateDecision {
  const target = env.VERCEL_ENV
  if (target === 'production') return { run: true }
  if (target === 'preview' || target === 'development') {
    return { run: false, reason: `VERCEL_ENV=${target}`, fail: false }
  }
  return {
    run: false,
    reason: target
      ? `unknown VERCEL_ENV=${target}, so this build cannot tell whether it is production.`
      : 'VERCEL_ENV is not set, so this build cannot tell whether it is production. ' +
        'Turn on "Automatically expose System Environment Variables" in the Vercel project settings ' +
        '(to skip on purpose, set VERCEL_ENV=preview).',
    fail: true,
  }
}

/**
 * まだ適用していないマイグレーションの名前。dev mode の記録（batch -1）だけは適用済みに数えない。
 * それ以外は batch が空でも適用済みとみなす（Payload の migrate も名前が記録にあれば飛ばすので、それに揃える）
 */
export function pendingMigrations(
  names: readonly string[],
  recorded: ReadonlyArray<{ name?: string | null; batch?: number | null }>,
): string[] {
  const ran = new Set(recorded.filter((m) => Number(m.batch) !== -1).map((m) => m.name))
  return names.filter((name) => !ran.has(name))
}

/** dev mode でスキーマを直接書き換えた記録（batch -1）があるか */
export function hasDevPush(recorded: ReadonlyArray<{ batch?: number | null }>): boolean {
  return recorded.some((m) => Number(m.batch) === -1)
}

/** 次に適用する分の batch（今ある記録のいちばん大きい batch の次。dev mode の記録は数えない） */
export function nextBatch(recorded: ReadonlyArray<{ batch?: number | null }>): number {
  const batches = recorded.map((m) => Number(m.batch)).filter((b) => Number.isFinite(b) && b > 0)
  return Math.max(0, ...batches) + 1
}

export type MigratePlan =
  | { kind: 'none' }
  | { kind: 'apply'; pending: string[]; devPush: boolean }
  | { kind: 'stop'; reason: string }

/**
 * このデプロイで何をするか。
 * - 未適用が無ければ何もしない（dev mode の記録があっても止めない）
 * - dev mode の記録が無ければ、未適用を全部当てる
 * - dev mode の記録があれば、未適用が全部「足すだけで、二度目も通る」形（isAdditiveMigration）のときだけ当てる。
 *   1つでも違えば何も当てずに止める（dev mode の書き換えと食い違うと、データが消えるおそれがある）
 */
export function planMigrations(
  names: readonly string[],
  recorded: ReadonlyArray<{ name?: string | null; batch?: number | null }>,
  isAdditive: (name: string) => boolean,
): MigratePlan {
  const pending = pendingMigrations(names, recorded)
  if (pending.length === 0) return { kind: 'none' }
  if (!hasDevPush(recorded)) return { kind: 'apply', pending, devPush: false }
  const unsafe = pending.filter((name) => !isAdditive(name))
  if (unsafe.length > 0) {
    return {
      kind: 'stop',
      reason:
        'this database has schema changes pushed in dev mode (payload_migrations has batch -1), and these ' +
        `pending migrations do more than add tables/columns/indexes/constraints, or fail when run twice: ${unsafe.join(', ')}. ` +
        'Applying them automatically could lose data, so the deploy stops here. Check it by hand.',
    }
  }
  return { kind: 'apply', pending, devPush: true }
}

// 足すだけで、すでにあれば何もしない文（識別子は "..." で囲んだ英数字と _ だけ）
const IDENT = '"[A-Za-z0-9_]+"'
const CREATE_TABLE = new RegExp(`^CREATE TABLE IF NOT EXISTS ${IDENT} \\(`)
const ADDITIVE_STATEMENTS = [
  CREATE_TABLE,
  new RegExp(`^CREATE (UNIQUE )?INDEX IF NOT EXISTS ${IDENT} ON ${IDENT} `),
  new RegExp(`^ALTER TABLE ${IDENT} ADD COLUMN IF NOT EXISTS ${IDENT} `),
  // 列挙型（select の選択肢）に値を足す
  new RegExp(
    `^ALTER TYPE "public"\\.${IDENT} ADD VALUE IF NOT EXISTS '[^']*'( (BEFORE|AFTER) '[^']*')?$`,
  ),
]
// DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN null; END $$;（すでにあれば何もしない）の中に置ける文
const ADDITIVE_GUARDED = [
  new RegExp(
    `^ALTER TABLE ${IDENT} ADD CONSTRAINT ${IDENT} FOREIGN KEY \\(${IDENT}\\) REFERENCES "public"\\.${IDENT}\\(${IDENT}\\)`,
  ),
  new RegExp(`^CREATE TYPE "public"\\.${IDENT} AS ENUM\\(`),
]
const DO_BLOCK =
  /DO \$\$ BEGIN\s*([\s\S]*?)\s*EXCEPTION\s*WHEN duplicate_object THEN null;\s*END \$\$;/g
// 外部キーの ON DELETE / ON UPDATE の指定（文の書き換えではない）
const FK_ACTIONS = /ON (DELETE|UPDATE) (CASCADE|SET NULL|SET DEFAULT|RESTRICT|NO ACTION)/gi
// 1つの ALTER TABLE に続けて書ける「消す・書き換える」操作など（許す形の文の中に紛れていたら断る）
const DESTRUCTIVE = /\b(DROP|RENAME|TRUNCATE|DELETE|UPDATE|INSERT|ALTER COLUMN)\b/i

// 括弧の中を取り除く（numeric(10, 2) や DEFAULT now() の中の , を数えないため）
const stripParens = (s: string) => {
  let out = s
  for (let prev = ''; prev !== out; ) {
    prev = out
    out = out.replace(/\([^()]*\)/g, '')
  }
  return out
}

const isAdditiveStatement = (statement: string, allowed: readonly RegExp[]) => {
  const s = statement.replace(/\s+/g, ' ').trim()
  if (!allowed.some((re) => re.test(s))) return false
  // SQL のコメント（-- や /* */）は Payload が出さない。括弧や , を隠せるので、あれば断る
  if (/--|\/\*/.test(s)) return false
  // 文字列（'...'。'' は中の '）を空にしてから括弧を取り除く。括弧や ' が残れば（対応が取れていない）断る
  const flat = stripParens(s.replace(/'(?:[^']|'')*'/g, "''")).trim()
  if (/[()']/.test(flat.replace(/''/g, ''))) return false
  // CREATE TABLE は表の名前と定義（括弧）だけ（INHERITS / AS SELECT などの続きは断る）
  if (CREATE_TABLE.test(s) && !new RegExp(`^CREATE TABLE IF NOT EXISTS ${IDENT}$`).test(flat)) {
    return false
  }
  // ALTER TABLE は操作1つだけ（..., ALTER "x" TYPE text / SET SCHEMA / ENABLE ROW LEVEL SECURITY などを , で続けた形は断る）
  if (s.startsWith('ALTER TABLE ') && flat.includes(',')) return false
  return !DESTRUCTIVE.test(s.replace(FK_ACTIONS, ''))
}

/**
 * マイグレーションのファイル（src/migrations/<名前>.ts）の中身から、up が「足すだけで、二度目も通る」形かを見る。
 * 表・列・索引を IF NOT EXISTS で足す文と、すでにあれば何もしない（duplicate_object を無視する）外部キー・列挙型だけなら true。
 * この形なら、dev mode でスキーマを直接書き換えたことがある DB（同じ表や列がすでにあるかもしれない）に当てても、
 * 消す・書き換えることは無い。up が db.execute(sql`...`) 以外のこと（payload の API・${} の埋め込みなど）をしていたら false。
 * Payload が生成するファイルの形（export async function up / down と、その中の await db.execute(sql`...`)）を前提に、
 * 文字列として読む（構文解析はしない）。迷う書き方は「足すだけではない」とみなす（記録がある DB ではデプロイが止まるだけ）
 */
export function isAdditiveMigration(source: string): boolean {
  const start = source.indexOf('export async function up(')
  const end = source.indexOf('export async function down(')
  if (start < 0 || end < start) return false
  const up = source.slice(start, end)

  const call = /await db\.execute\(sql`([^`]*)`\)/g
  const bodies = [...up.matchAll(call)].map((m) => m[1] ?? '')
  if (bodies.length === 0 || bodies.some((sql) => sql.includes('${'))) return false
  // 呼び出しを除いた残りが、関数の宣言と括弧だけか（コメントは除く）
  const rest = up
    .replace(call, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\s+/g, '')
  if (!/^exportasyncfunctionup\(\{[\w,]*\}:MigrateUpArgs\):Promise<void>\{;*\}$/.test(rest))
    return false

  let statements = 0
  for (const sql of bodies) {
    let ok = true
    const plain = sql.replace(DO_BLOCK, (_, inner: string) => {
      statements++
      if (
        !isAdditiveStatement(inner, ADDITIVE_GUARDED) ||
        inner.trim().replace(/;$/, '').includes(';')
      ) {
        ok = false
      }
      return ''
    })
    if (!ok) return false
    for (const statement of plain.split(';')) {
      if (!statement.trim()) continue
      statements++
      if (!isAdditiveStatement(statement, ADDITIVE_STATEMENTS)) return false
    }
  }
  return statements > 0
}
