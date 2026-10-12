import { describe, expect, it } from 'vitest'
import {
  hasDevPush,
  isAdditiveMigration,
  migrateDecision,
  nextBatch,
  pendingMigrations,
  planMigrations,
} from '../deployMigrate'

describe('migrateDecision', () => {
  it('Vercel の Production のビルドだけで適用する', () => {
    expect(migrateDecision({ VERCEL: '1', VERCEL_ENV: 'production' })).toEqual({ run: true })
    expect(migrateDecision({ VERCEL_ENV: 'production' })).toEqual({ run: true })
  })

  it('Preview・development のビルドでは何もしない（失敗にもしない）', () => {
    for (const env of ['preview', 'development']) {
      expect(migrateDecision({ VERCEL: '1', VERCEL_ENV: env })).toMatchObject({
        run: false,
        fail: false,
      })
    }
  })

  it('VERCEL_ENV が無い・知らない値のときは止める（システム環境変数が出ていない設定でも黙って飛ばさない）', () => {
    expect(migrateDecision({})).toMatchObject({ run: false, fail: true })
    expect(migrateDecision({ VERCEL: '1' })).toMatchObject({ run: false, fail: true })
    expect(migrateDecision({ VERCEL: '1', VERCEL_ENV: 'staging' })).toMatchObject({
      run: false,
      fail: true,
    })
  })
})

describe('pendingMigrations', () => {
  const names = ['a', 'b', 'c']

  it('適用済みの記録が無いものを、並び順のまま返す', () => {
    expect(pendingMigrations(names, [{ name: 'a', batch: 1 }])).toEqual(['b', 'c'])
    expect(
      pendingMigrations(
        names,
        names.map((name) => ({ name, batch: 2 })),
      ),
    ).toEqual([])
  })

  it('dev mode の記録（batch -1）は適用済みに数えない。batch の無い記録は Payload と同じく適用済み', () => {
    expect(
      pendingMigrations(names, [
        { name: 'a', batch: -1 },
        { name: 'b', batch: null },
        { name: 'c', batch: 3 },
      ]),
    ).toEqual(['a'])
  })
})

describe('hasDevPush', () => {
  it('batch -1 の記録があるかを見る', () => {
    expect(hasDevPush([{ batch: 1 }, { batch: -1 }])).toBe(true)
    expect(hasDevPush([{ batch: 1 }, { batch: null }])).toBe(false)
    expect(hasDevPush([])).toBe(false)
  })
})

describe('nextBatch', () => {
  it('いちばん大きい batch の次。dev mode の記録・空の batch は数えない', () => {
    expect(nextBatch([])).toBe(1)
    expect(nextBatch([{ batch: 1 }, { batch: 3 }, { batch: 2 }])).toBe(4)
    expect(nextBatch([{ batch: -1 }, { batch: null }])).toBe(1)
    expect(nextBatch([{ batch: 2 }, { batch: -1 }])).toBe(3)
  })
})

describe('planMigrations', () => {
  const names = ['a', 'b', 'c']
  const additive = (name: string) => name !== 'a'
  const dev = { name: 'dev', batch: -1 }

  it('未適用が無ければ何もしない（dev mode の記録があっても止めない）', () => {
    const all = names.map((name) => ({ name, batch: 1 }))
    expect(planMigrations(names, all, additive)).toEqual({ kind: 'none' })
    expect(planMigrations(names, [...all, dev], additive)).toEqual({ kind: 'none' })
  })

  it('dev mode の記録が無ければ、足すだけでないものも含めて未適用を全部当てる', () => {
    expect(planMigrations(names, [], additive)).toEqual({
      kind: 'apply',
      pending: ['a', 'b', 'c'],
      devPush: false,
    })
  })

  it('dev mode の記録があり、未適用が全部足すだけなら当てる', () => {
    expect(planMigrations(names, [{ name: 'a', batch: 1 }, dev], additive)).toEqual({
      kind: 'apply',
      pending: ['b', 'c'],
      devPush: true,
    })
  })

  it('dev mode の記録があり、未適用に足すだけでないものが1つでもあれば、何も当てずに止める', () => {
    const plan = planMigrations(names, [dev], additive)
    expect(plan.kind).toBe('stop')
    expect(plan.kind === 'stop' && plan.reason).toContain(': a.')
  })
})

describe('isAdditiveMigration', () => {
  const file = (
    sql: string,
    extra = '',
  ) => `import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-vercel-postgres'

// コメント
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql\`${sql}\`)${extra}
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql\`DROP TABLE "x";\`)
}
`
  const fk = (stmt: string) =>
    `DO $$ BEGIN\n ${stmt}\nEXCEPTION\n WHEN duplicate_object THEN null;\nEND $$;`

  it('IF NOT EXISTS で表・列・索引を足す文と、すでにあれば何もしない外部キー・列挙型だけなら true（down は見ない）', () => {
    expect(
      isAdditiveMigration(
        file(`
   CREATE TABLE IF NOT EXISTS "passkeys" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "pending" boolean DEFAULT false;
  ${fk('ALTER TABLE "passkeys" ADD CONSTRAINT "passkeys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;')}
  ${fk(`CREATE TYPE "public"."enum_x_kind" AS ENUM('a', 'b');`)}
  CREATE INDEX IF NOT EXISTS "passkeys_user_idx" ON "passkeys" USING btree ("user_id");
  CREATE UNIQUE INDEX IF NOT EXISTS "passkeys_id_idx" ON "passkeys" USING btree ("id");`),
      ),
    ).toBe(true)
    // 括弧の中の ,（numeric(10, 2)）は操作の区切りとみなさない。列挙型への値の追加（IF NOT EXISTS）も足すだけ
    expect(
      isAdditiveMigration(
        file(`ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "price" numeric(10, 2) DEFAULT 0;
  ALTER TYPE "public"."enum_timeline_post_type" ADD VALUE IF NOT EXISTS 'photo';
  ALTER TYPE "public"."enum_timeline_post_type" ADD VALUE IF NOT EXISTS 'memo' BEFORE 'tech';`),
      ),
    ).toBe(true)
  })

  it('二度目に失敗する文（IF NOT EXISTS の無い ADD COLUMN・CREATE TABLE、囲みの無い外部キー）は false', () => {
    expect(isAdditiveMigration(file('ALTER TABLE "media" ADD COLUMN "pending" boolean;'))).toBe(
      false,
    )
    expect(isAdditiveMigration(file('CREATE TABLE "x" ("id" serial);'))).toBe(false)
    expect(
      isAdditiveMigration(
        file(
          'ALTER TABLE "a" ADD CONSTRAINT "a_fk" FOREIGN KEY ("b_id") REFERENCES "public"."b"("id");',
        ),
      ),
    ).toBe(false)
  })

  it('消す・書き換える文は false（許す形の文の後ろに続けて書いたものも）', () => {
    for (const sql of [
      'DROP TABLE "x";',
      'ALTER TABLE "x" DROP COLUMN "y";',
      'ALTER TABLE "x" RENAME COLUMN "y" TO "z";',
      'ALTER TABLE "x" ALTER COLUMN "y" SET DATA TYPE text;',
      'UPDATE "x" SET "y" = 1;',
      'DELETE FROM "x";',
      'TRUNCATE "x";',
      'ALTER TABLE "x" ADD COLUMN IF NOT EXISTS "y" integer, DROP COLUMN "z";',
      'ALTER TABLE "x" ADD COLUMN IF NOT EXISTS "y" integer, ALTER COLUMN "z" TYPE text;',
      // COLUMN を省いた ALTER・SET SCHEMA・コメントをはさんだ続きなど、, で操作を続けた形
      'ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "pending" boolean, ALTER "alt" TYPE text USING NULL;',
      'ALTER TABLE "x" ADD COLUMN IF NOT EXISTS "y" integer, SET SCHEMA "attic";',
      'ALTER TABLE "x" ADD COLUMN IF NOT EXISTS "y" integer -- note\n, ENABLE ROW LEVEL SECURITY;',
      'ALTER TABLE "x" ADD COLUMN IF NOT EXISTS "y" integer, ADD COLUMN "z" integer;',
      // 文字列やコメントの中の対応しない括弧で , を隠した形
      `ALTER TABLE "t" ADD COLUMN IF NOT EXISTS "c" varchar DEFAULT '(', ALTER "y" TYPE varchar USING ')';`,
      'ALTER TABLE "t" ADD COLUMN IF NOT EXISTS "c" int -- (\n, ALTER "y" TYPE text USING NULL -- )\n;',
      // 表の定義のあとに続けた形
      'CREATE TABLE IF NOT EXISTS "x" ("a" integer) INHERITS ("media");',
      'CREATE TABLE IF NOT EXISTS "x" ("id") AS SELECT "id" FROM "media";',
      // 列挙型の値の名前を変える・IF NOT EXISTS の無い追加
      `ALTER TYPE "public"."enum_x" RENAME VALUE 'a' TO 'b';`,
      `ALTER TYPE "public"."enum_x" ADD VALUE 'c';`,
    ]) {
      expect(isAdditiveMigration(file(sql)), sql).toBe(false)
    }
    // 囲み（duplicate_object を無視）の中に2つ目の文を紛れ込ませても false
    expect(
      isAdditiveMigration(
        file(
          fk(
            'ALTER TABLE "a" ADD CONSTRAINT "a_fk" FOREIGN KEY ("b_id") REFERENCES "public"."b"("id"); DROP TABLE "a";',
          ),
        ),
      ),
    ).toBe(false)
  })

  it('up が SQL 以外のことをしている・${} を埋め込んでいる・中身が無いときは false', () => {
    const ok = 'ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "pending" boolean;'
    expect(isAdditiveMigration(file(ok))).toBe(true)
    expect(
      isAdditiveMigration(
        file(ok, "\n  await payload.update({ collection: 'media', where: {}, data: {} })"),
      ),
    ).toBe(false)
    expect(
      isAdditiveMigration(file('ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "y" integer;')),
    ).toBe(false)
    expect(isAdditiveMigration(file('   '))).toBe(false)
    expect(isAdditiveMigration('export const nothing = 1')).toBe(false)
  })
})
