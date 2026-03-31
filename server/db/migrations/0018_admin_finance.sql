-- Admin Finance: עלויות והכנסות
-- Cursor, מערכות תשלום, מנויים וכו'

CREATE TABLE IF NOT EXISTS "admin_finance_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "type" varchar(16) NOT NULL CHECK ("type" IN ('income', 'expense')),
  "category" varchar(64) NOT NULL,
  "name" varchar(255) NOT NULL,
  "amount" decimal(12,2) NOT NULL,
  "currency" varchar(8) DEFAULT 'ILS' NOT NULL,
  "recurrence" varchar(32) DEFAULT 'monthly' NOT NULL CHECK ("recurrence" IN ('one_time', 'monthly', 'yearly')),
  "period_month" integer,
  "period_year" integer,
  "notes" text,
  "created_by" uuid REFERENCES "admin_users"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "admin_finance_entries_type_idx" ON "admin_finance_entries" ("type");
CREATE INDEX IF NOT EXISTS "admin_finance_entries_category_idx" ON "admin_finance_entries" ("category");
CREATE INDEX IF NOT EXISTS "admin_finance_entries_period_idx" ON "admin_finance_entries" ("period_year", "period_month");
