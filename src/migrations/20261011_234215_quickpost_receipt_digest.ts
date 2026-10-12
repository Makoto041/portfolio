import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-vercel-postgres'

// up は足すだけで、二度目も通る形（IF NOT EXISTS）にしてある（src/lib/deployMigrate.ts の isAdditiveMigration）
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "quickpost_nonces" ADD COLUMN IF NOT EXISTS "digest" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "quickpost_nonces" DROP COLUMN IF EXISTS "digest";`)
}
