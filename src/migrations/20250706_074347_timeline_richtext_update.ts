import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-vercel-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_timeline_priority" AS ENUM('normal', 'important', 'pinned');
  CREATE TYPE "public"."enum_events_platform" AS ENUM('twitch', 'youtube', 'nico', 'offline', 'other');
  CREATE TABLE IF NOT EXISTS "timeline_images" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "timeline_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE IF NOT EXISTS "blog_media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE IF NOT EXISTS "letter" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"message" varchar NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"summary" varchar,
  	"platform" "enum_events_platform" DEFAULT 'twitch',
  	"external_url" varchar,
  	"start_date" timestamp(3) with time zone NOT NULL,
  	"end_date" timestamp(3) with time zone,
  	"thumbnail_id" integer,
  	"slug" varchar NOT NULL,
  	"is_public" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "products" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"description" varchar,
  	"url" varchar,
  	"image_id" integer,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "products_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  ALTER TABLE "blog_posts" DROP CONSTRAINT "blog_posts_cover_image_id_media_id_fk";
  
  ALTER TABLE "media" ALTER COLUMN "alt" DROP NOT NULL;
  ALTER TABLE "timeline" ADD COLUMN "text_new" jsonb;
  UPDATE "timeline" SET "text_new" = CASE 
    WHEN "text" IS NULL OR "text" = '' THEN NULL
    ELSE ('{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"' || replace("text", '"', '\"') || '","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}')::jsonb
  END;
  ALTER TABLE "timeline" DROP COLUMN "text";
  ALTER TABLE "timeline" RENAME COLUMN "text_new" TO "text";
  ALTER TABLE "media" ADD COLUMN "is_timeline_only" boolean DEFAULT false;
  ALTER TABLE "timeline" ADD COLUMN "embed_url" varchar;
  ALTER TABLE "timeline" ADD COLUMN "url_metadata_title" varchar;
  ALTER TABLE "timeline" ADD COLUMN "url_metadata_description" varchar;
  ALTER TABLE "timeline" ADD COLUMN "url_metadata_image" varchar;
  ALTER TABLE "timeline" ADD COLUMN "url_metadata_site_name" varchar;
  ALTER TABLE "timeline" ADD COLUMN "url_metadata_url" varchar;
  ALTER TABLE "timeline" ADD COLUMN "priority" "enum_timeline_priority" DEFAULT 'normal';
  ALTER TABLE "timeline" ADD COLUMN "likes" numeric DEFAULT 0;
  CREATE TABLE IF NOT EXISTS "timeline_tags" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar
  );
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "blog_media_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "letter_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "events_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "products_id" integer;
  DO $$ BEGIN
   ALTER TABLE "timeline_images" ADD CONSTRAINT "timeline_images_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "timeline_images" ADD CONSTRAINT "timeline_images_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."timeline"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "timeline_texts" ADD CONSTRAINT "timeline_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."timeline"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "timeline_tags" ADD CONSTRAINT "timeline_tags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."timeline"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "events" ADD CONSTRAINT "events_thumbnail_id_media_id_fk" FOREIGN KEY ("thumbnail_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "products" ADD CONSTRAINT "products_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "products_texts" ADD CONSTRAINT "products_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  CREATE INDEX IF NOT EXISTS "timeline_images_order_idx" ON "timeline_images" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "timeline_images_parent_id_idx" ON "timeline_images" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "timeline_images_image_idx" ON "timeline_images" USING btree ("image_id");
  CREATE INDEX IF NOT EXISTS "timeline_texts_order_parent_idx" ON "timeline_texts" USING btree ("order","parent_id");
  CREATE INDEX IF NOT EXISTS "timeline_tags_order_idx" ON "timeline_tags" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "timeline_tags_parent_id_idx" ON "timeline_tags" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "blog_media_updated_at_idx" ON "blog_media" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "blog_media_created_at_idx" ON "blog_media" USING btree ("created_at");
  CREATE UNIQUE INDEX IF NOT EXISTS "blog_media_filename_idx" ON "blog_media" USING btree ("filename");
  CREATE INDEX IF NOT EXISTS "letter_updated_at_idx" ON "letter" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "events_thumbnail_idx" ON "events" USING btree ("thumbnail_id");
  CREATE UNIQUE INDEX IF NOT EXISTS "events_slug_idx" ON "events" USING btree ("slug");
  CREATE INDEX IF NOT EXISTS "events_updated_at_idx" ON "events" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "events_created_at_idx" ON "events" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "products_image_idx" ON "products" USING btree ("image_id");
  CREATE INDEX IF NOT EXISTS "products_updated_at_idx" ON "products" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "products_created_at_idx" ON "products" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "products_texts_order_parent_idx" ON "products_texts" USING btree ("order","parent_id");
  DO $$ BEGIN
   ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_cover_image_id_blog_media_id_fk" FOREIGN KEY ("cover_image_id") REFERENCES "public"."blog_media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_blog_media_fk" FOREIGN KEY ("blog_media_id") REFERENCES "public"."blog_media"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_letter_fk" FOREIGN KEY ("letter_id") REFERENCES "public"."letter"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_events_fk" FOREIGN KEY ("events_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_blog_media_id_idx" ON "payload_locked_documents_rels" USING btree ("blog_media_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_letter_id_idx" ON "payload_locked_documents_rels" USING btree ("letter_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_events_id_idx" ON "payload_locked_documents_rels" USING btree ("events_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_products_id_idx" ON "payload_locked_documents_rels" USING btree ("products_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "timeline_images" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "timeline_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "blog_media" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "letter" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "events" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_texts" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "timeline_images" CASCADE;
  DROP TABLE "timeline_texts" CASCADE;
  DROP TABLE "timeline_tags" CASCADE;
  DROP TABLE "blog_media" CASCADE;
  DROP TABLE "letter" CASCADE;
  DROP TABLE "events" CASCADE;
  DROP TABLE "products" CASCADE;
  DROP TABLE "products_texts" CASCADE;
  ALTER TABLE "blog_posts" DROP CONSTRAINT "blog_posts_cover_image_id_blog_media_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_blog_media_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_letter_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_events_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_products_fk";
  
  DROP INDEX IF EXISTS "payload_locked_documents_rels_blog_media_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_letter_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_events_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_products_id_idx";
  ALTER TABLE "media" ALTER COLUMN "alt" SET NOT NULL;
  ALTER TABLE "timeline" ALTER COLUMN "text" SET DATA TYPE varchar;
  DO $$ BEGIN
   ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_cover_image_id_media_id_fk" FOREIGN KEY ("cover_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  ALTER TABLE "media" DROP COLUMN IF EXISTS "is_timeline_only";
  ALTER TABLE "timeline" DROP COLUMN IF EXISTS "embed_url";
  ALTER TABLE "timeline" DROP COLUMN IF EXISTS "url_metadata_title";
  ALTER TABLE "timeline" DROP COLUMN IF EXISTS "url_metadata_description";
  ALTER TABLE "timeline" DROP COLUMN IF EXISTS "url_metadata_image";
  ALTER TABLE "timeline" DROP COLUMN IF EXISTS "url_metadata_site_name";
  ALTER TABLE "timeline" DROP COLUMN IF EXISTS "url_metadata_url";
  ALTER TABLE "timeline" DROP COLUMN IF EXISTS "priority";
  ALTER TABLE "timeline" DROP COLUMN IF EXISTS "likes";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "blog_media_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "letter_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "events_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "products_id";
  DROP TYPE "public"."enum_timeline_priority";
  DROP TYPE "public"."enum_events_platform";`)
}
