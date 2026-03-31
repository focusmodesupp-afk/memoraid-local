-- Content pages for CMS
CREATE TABLE IF NOT EXISTS "content_pages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" varchar(128) NOT NULL UNIQUE,
  "title" varchar(255) NOT NULL,
  "content" text,
  "meta_description" text,
  "published" boolean DEFAULT false NOT NULL,
  "locale" varchar(8) DEFAULT 'he' NOT NULL,
  "updated_by" uuid REFERENCES "admin_users"("id") ON DELETE SET NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Media library
CREATE TABLE IF NOT EXISTS "media_library" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "filename" varchar(255) NOT NULL,
  "original_name" varchar(255) NOT NULL,
  "mime_type" varchar(64),
  "size_bytes" integer,
  "url" text NOT NULL,
  "uploaded_by" uuid REFERENCES "admin_users"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "content_pages_slug_idx" ON "content_pages"("slug");
CREATE INDEX IF NOT EXISTS "content_pages_published_idx" ON "content_pages"("published");
