import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-vercel-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE IF NOT EXISTS "passkeys" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"user_id" integer NOT NULL,
  	"credential_id" varchar NOT NULL,
  	"public_key" varchar NOT NULL,
  	"counter" numeric DEFAULT 0,
  	"transports" varchar,
  	"backed_up" boolean DEFAULT false,
  	"last_used_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "post_sessions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"user_id" integer NOT NULL,
  	"passkey_id" integer,
  	"token_hash" varchar NOT NULL,
  	"challenge_hash" varchar,
  	"last_used_at" timestamp(3) with time zone NOT NULL,
  	"expires_at" timestamp(3) with time zone NOT NULL,
  	"last_post_at" timestamp(3) with time zone,
  	"post_count" numeric DEFAULT 0,
  	"rl_window_start" timestamp(3) with time zone,
  	"rl_posts" numeric DEFAULT 0,
  	"rl_photos" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "timeline" ADD COLUMN "quick_post_key" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "passkeys_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "post_sessions_id" integer;
  DO $$ BEGIN
   ALTER TABLE "passkeys" ADD CONSTRAINT "passkeys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "post_sessions" ADD CONSTRAINT "post_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "post_sessions" ADD CONSTRAINT "post_sessions_passkey_id_passkeys_id_fk" FOREIGN KEY ("passkey_id") REFERENCES "public"."passkeys"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  CREATE INDEX IF NOT EXISTS "passkeys_user_idx" ON "passkeys" USING btree ("user_id");
  CREATE UNIQUE INDEX IF NOT EXISTS "passkeys_credential_id_idx" ON "passkeys" USING btree ("credential_id");
  CREATE INDEX IF NOT EXISTS "passkeys_updated_at_idx" ON "passkeys" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "passkeys_created_at_idx" ON "passkeys" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "post_sessions_user_idx" ON "post_sessions" USING btree ("user_id");
  CREATE INDEX IF NOT EXISTS "post_sessions_passkey_idx" ON "post_sessions" USING btree ("passkey_id");
  CREATE UNIQUE INDEX IF NOT EXISTS "post_sessions_token_hash_idx" ON "post_sessions" USING btree ("token_hash");
  CREATE UNIQUE INDEX IF NOT EXISTS "post_sessions_challenge_hash_idx" ON "post_sessions" USING btree ("challenge_hash");
  CREATE INDEX IF NOT EXISTS "post_sessions_updated_at_idx" ON "post_sessions" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "post_sessions_created_at_idx" ON "post_sessions" USING btree ("created_at");
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_passkeys_fk" FOREIGN KEY ("passkeys_id") REFERENCES "public"."passkeys"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_post_sessions_fk" FOREIGN KEY ("post_sessions_id") REFERENCES "public"."post_sessions"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  CREATE UNIQUE INDEX IF NOT EXISTS "timeline_quick_post_key_idx" ON "timeline" USING btree ("quick_post_key");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_passkeys_id_idx" ON "payload_locked_documents_rels" USING btree ("passkeys_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_post_sessions_id_idx" ON "payload_locked_documents_rels" USING btree ("post_sessions_id");`)
}

// down: DROP TABLE ... CASCADE が payload_locked_documents_rels の外部キーも先に消すため、DROP CONSTRAINT は IF EXISTS にしている
export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "passkeys" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "post_sessions" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "passkeys" CASCADE;
  DROP TABLE "post_sessions" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_passkeys_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_post_sessions_fk";
  
  DROP INDEX IF EXISTS "timeline_quick_post_key_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_passkeys_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_post_sessions_id_idx";
  ALTER TABLE "timeline" DROP COLUMN IF EXISTS "quick_post_key";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "passkeys_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "post_sessions_id";`)
}
