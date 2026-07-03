import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-vercel-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   DO $$ BEGIN
   CREATE TYPE "public"."enum_timeline_post_type" AS ENUM('diary', 'tech', 'photo', 'making', 'event', 'travel', 'study');
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  DO $$ BEGIN
   CREATE TYPE "public"."enum_site_settings_profile_social_links_platform" AS ENUM('twitter', 'instagram', 'github', 'linkedin', 'youtube', 'other');
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  CREATE TABLE IF NOT EXISTS "site_settings_profile_social_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"platform" "enum_site_settings_profile_social_links_platform" NOT NULL,
  	"url" varchar NOT NULL,
  	"display_name" varchar
  );
  
  CREATE TABLE IF NOT EXISTS "site_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"profile_name" varchar DEFAULT 'Makoto Iwabuchi' NOT NULL,
  	"profile_name_japanese" varchar DEFAULT 'いわぶちまこと' NOT NULL,
  	"profile_title" varchar DEFAULT 'ウェブエンジニア' NOT NULL,
  	"profile_description" varchar DEFAULT 'ウェブエンジニア／フロントエンド好き。Payload CMS × Next.jsでポートフォリオサイトを構築しています。' NOT NULL,
  	"profile_profile_image_id" integer NOT NULL,
  	"seo_site_title" varchar DEFAULT 'いわぶち | 個人ポートフォリオサイト' NOT NULL,
  	"seo_site_description" varchar DEFAULT 'いわぶちの個人ポートフォリオサイト。日記、ブログ、写真ギャラリーなど日々の活動や作品を公開しています。' NOT NULL,
  	"seo_site_url" varchar DEFAULT 'https://iwabuchi-makoto.com' NOT NULL,
  	"seo_twitter_handle" varchar DEFAULT 'iwabuchi',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "timeline" ADD COLUMN IF NOT EXISTS "title" varchar;
  ALTER TABLE "timeline" ADD COLUMN IF NOT EXISTS "post_type" "enum_timeline_post_type" DEFAULT 'diary';
  ALTER TABLE "timeline" ADD COLUMN IF NOT EXISTS "related_event_id" integer;
  ALTER TABLE "timeline" ADD COLUMN IF NOT EXISTS "related_post_id" integer;
  ALTER TABLE "timeline" ADD COLUMN IF NOT EXISTS "related_product_id" integer;
  DO $$ BEGIN
   ALTER TABLE "site_settings_profile_social_links" ADD CONSTRAINT "site_settings_profile_social_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_profile_profile_image_id_media_id_fk" FOREIGN KEY ("profile_profile_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  CREATE INDEX IF NOT EXISTS "site_settings_profile_social_links_order_idx" ON "site_settings_profile_social_links" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "site_settings_profile_social_links_parent_id_idx" ON "site_settings_profile_social_links" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "site_settings_profile_profile_profile_image_idx" ON "site_settings" USING btree ("profile_profile_image_id");
  DO $$ BEGIN
   ALTER TABLE "timeline" ADD CONSTRAINT "timeline_related_event_id_events_id_fk" FOREIGN KEY ("related_event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "timeline" ADD CONSTRAINT "timeline_related_post_id_blog_posts_id_fk" FOREIGN KEY ("related_post_id") REFERENCES "public"."blog_posts"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "timeline" ADD CONSTRAINT "timeline_related_product_id_products_id_fk" FOREIGN KEY ("related_product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  CREATE INDEX IF NOT EXISTS "timeline_related_related_event_idx" ON "timeline" USING btree ("related_event_id");
  CREATE INDEX IF NOT EXISTS "timeline_related_related_post_idx" ON "timeline" USING btree ("related_post_id");
  CREATE INDEX IF NOT EXISTS "timeline_related_related_product_idx" ON "timeline" USING btree ("related_product_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_settings_profile_social_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "site_settings" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "site_settings_profile_social_links" CASCADE;
  DROP TABLE "site_settings" CASCADE;
  ALTER TABLE "timeline" DROP CONSTRAINT "timeline_related_event_id_events_id_fk";
  
  ALTER TABLE "timeline" DROP CONSTRAINT "timeline_related_post_id_blog_posts_id_fk";
  
  ALTER TABLE "timeline" DROP CONSTRAINT "timeline_related_product_id_products_id_fk";
  
  DROP INDEX IF EXISTS "timeline_related_related_event_idx";
  DROP INDEX IF EXISTS "timeline_related_related_post_idx";
  DROP INDEX IF EXISTS "timeline_related_related_product_idx";
  ALTER TABLE "timeline" DROP COLUMN IF EXISTS "title";
  ALTER TABLE "timeline" DROP COLUMN IF EXISTS "post_type";
  ALTER TABLE "timeline" DROP COLUMN IF EXISTS "related_event_id";
  ALTER TABLE "timeline" DROP COLUMN IF EXISTS "related_post_id";
  ALTER TABLE "timeline" DROP COLUMN IF EXISTS "related_product_id";
  DROP TYPE "public"."enum_timeline_post_type";
  DROP TYPE "public"."enum_site_settings_profile_social_links_platform";`)
}
