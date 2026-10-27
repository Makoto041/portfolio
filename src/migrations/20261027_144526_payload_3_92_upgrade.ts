import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-vercel-postgres'

// Payload 3.38 → 3.92 の更新で増えたスキーマ（ログイン中のセッション・KV ストア・パスワード再設定の要求時刻・S3 のオブジェクトキー）。
// up は足すだけで、二度目も通る形（IF NOT EXISTS）にしてある。dev mode で同じ表や列をすでに作った DB にも当てられる
// （本番デプロイの自動適用が src/lib/deployMigrate.ts の isAdditiveMigration で確かめる）。
// Payload が生成した DROP INDEX は入れていない: 3.92 は timeline_texts / products_texts の索引の名前を変えたが、
// 旧い名前（*_order_parent_idx）の索引を消す文は「足すだけ」ではないので、新しい名前の索引を足すだけにした。
// 旧い名前の索引は同じ列の索引としてそのまま残る（冗長だが無害。消すなら別のマイグレーションで）
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE IF NOT EXISTS "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );

  CREATE TABLE IF NOT EXISTS "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );

  ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "reset_password_requested_at" timestamp(3) with time zone;
  ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "_objectkey" varchar;
  ALTER TABLE "blog_media" ADD COLUMN IF NOT EXISTS "_objectkey" varchar;
  DO $$ BEGIN
   ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;

  CREATE INDEX IF NOT EXISTS "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE UNIQUE INDEX IF NOT EXISTS "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX IF NOT EXISTS "timeline_texts_order_parent" ON "timeline_texts" USING btree ("order","parent_id");
  CREATE INDEX IF NOT EXISTS "products_texts_order_parent" ON "products_texts" USING btree ("order","parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE IF EXISTS "users_sessions" CASCADE;
  DROP TABLE IF EXISTS "payload_kv" CASCADE;
  DROP INDEX IF EXISTS "timeline_texts_order_parent";
  DROP INDEX IF EXISTS "products_texts_order_parent";
  ALTER TABLE "users" DROP COLUMN IF EXISTS "reset_password_requested_at";
  ALTER TABLE "media" DROP COLUMN IF EXISTS "_objectkey";
  ALTER TABLE "blog_media" DROP COLUMN IF EXISTS "_objectkey";`)
}
