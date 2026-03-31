-- Feature flags
CREATE TABLE IF NOT EXISTS "feature_flags" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "key" varchar(64) NOT NULL UNIQUE,
  "enabled" boolean DEFAULT false NOT NULL,
  "description" text,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- App versions
CREATE TABLE IF NOT EXISTS "app_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "version" varchar(32) NOT NULL,
  "platform" varchar(16) NOT NULL DEFAULT 'web',
  "release_notes" text,
  "released_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
