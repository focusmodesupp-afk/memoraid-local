-- Admin Plans: מטא-דאטה למסלולים ותמחור
-- Stripe Products/Prices כמקור אמת; הטבלה לשמות בעברית, תכונות, סדר תצוגה

CREATE TABLE IF NOT EXISTS "admin_plans" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "stripe_product_id" varchar(255),
  "stripe_price_id_monthly" varchar(255),
  "stripe_price_id_yearly" varchar(255),
  "slug" varchar(64) NOT NULL UNIQUE,
  "name_he" varchar(255) NOT NULL,
  "description_he" text,
  "features" jsonb DEFAULT '[]',
  "display_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "admin_plans_slug_idx" ON "admin_plans" ("slug");
CREATE INDEX IF NOT EXISTS "admin_plans_is_active_idx" ON "admin_plans" ("is_active");

-- Admin Coupon Meta: מטא-דאטה לקודי קופון
-- Stripe Coupons + Promotion Codes כמקור אמת; הטבלה למקור (newsletter, social, partner)

CREATE TABLE IF NOT EXISTS "admin_coupon_meta" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "stripe_promotion_code_id" varchar(255) NOT NULL UNIQUE,
  "source" varchar(32) DEFAULT 'other' NOT NULL CHECK ("source" IN ('newsletter', 'social', 'partner', 'other')),
  "campaign_name" varchar(255),
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "admin_coupon_meta_source_idx" ON "admin_coupon_meta" ("source");
