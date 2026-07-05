import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-vercel-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE IF NOT EXISTS "notices" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"date" timestamp(3) with time zone NOT NULL,
  	"body" varchar NOT NULL,
  	"is_public" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "notices_id" integer;
  ALTER TABLE "site_settings" ADD COLUMN "hero_tagline" varchar DEFAULT '日々の記録、ときどき写真。つぶやきくらいの気軽さで。';
  ALTER TABLE "site_settings" ADD COLUMN "hero_role_en" varchar DEFAULT '— web engineer, tokyo';
  CREATE INDEX IF NOT EXISTS "notices_updated_at_idx" ON "notices" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "notices_created_at_idx" ON "notices" USING btree ("created_at");
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_notices_fk" FOREIGN KEY ("notices_id") REFERENCES "public"."notices"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_notices_id_idx" ON "payload_locked_documents_rels" USING btree ("notices_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // 依存オブジェクト（FK制約・インデックス・カラム）を先に削除してから notices を落とす。
  // DROP TABLE CASCADE を先に実行すると FK が暗黙削除され、後続の DROP CONSTRAINT が失敗するため。
  await db.execute(sql`
   ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_notices_fk";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_notices_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "notices_id";
  ALTER TABLE "site_settings" DROP COLUMN IF EXISTS "hero_tagline";
  ALTER TABLE "site_settings" DROP COLUMN IF EXISTS "hero_role_en";
  ALTER TABLE "notices" DISABLE ROW LEVEL SECURITY;
  DROP TABLE IF EXISTS "notices" CASCADE;`)
}
