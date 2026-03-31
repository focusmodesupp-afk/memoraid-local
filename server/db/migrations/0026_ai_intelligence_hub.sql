-- AI Intelligence Hub - new tables and columns
-- PRD: Admin Intelligence Hub

-- 1. ai_model_benchmarks - manual/automatic benchmark scores per model
CREATE TABLE IF NOT EXISTS ai_model_benchmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model varchar(64) NOT NULL,
  benchmark_date date NOT NULL DEFAULT CURRENT_DATE,
  speed_score integer CHECK (speed_score IS NULL OR (speed_score BETWEEN 1 AND 100)),
  quality_score integer CHECK (quality_score IS NULL OR (quality_score BETWEEN 1 AND 100)),
  cost_score integer CHECK (cost_score IS NULL OR (cost_score BETWEEN 1 AND 100)),
  reliability_score integer CHECK (reliability_score IS NULL OR (reliability_score BETWEEN 1 AND 100)),
  capability_score integer CHECK (capability_score IS NULL OR (capability_score BETWEEN 1 AND 100)),
  composite_score integer,
  notes text,
  created_by uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- 2. ai_insights - automatic insights storage
CREATE TABLE IF NOT EXISTS ai_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_type varchar(64) NOT NULL,
  severity varchar(16) NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  title varchar(255) NOT NULL,
  description text NOT NULL,
  data jsonb,
  model_ref varchar(64),
  admin_ref uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  is_read boolean DEFAULT false,
  is_dismissed boolean DEFAULT false,
  valid_until timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- 3. ai_usage_daily_summary - daily aggregates for performance
CREATE TABLE IF NOT EXISTS ai_usage_daily_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  summary_date date NOT NULL,
  model varchar(64) NOT NULL,
  endpoint varchar(128),
  admin_user_id uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  total_calls integer DEFAULT 0,
  total_tokens integer DEFAULT 0,
  total_cost_usd decimal(12, 6) DEFAULT 0,
  avg_tokens_per_call integer,
  success_count integer DEFAULT 0,
  error_count integer DEFAULT 0,
  avg_quality_score decimal(4, 2),
  created_at timestamp with time zone DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ai_usage_daily_summary_unique_idx
  ON ai_usage_daily_summary (summary_date, model, COALESCE(endpoint, ''), COALESCE(admin_user_id::text, ''));

-- 4. Add columns to admin_ai_analyses
ALTER TABLE admin_ai_analyses
  ADD COLUMN IF NOT EXISTS response_time_ms integer,
  ADD COLUMN IF NOT EXISTS question_quality_score integer,
  ADD COLUMN IF NOT EXISTS resulted_in_tasks boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS task_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS use_case varchar(64),
  ADD COLUMN IF NOT EXISTS tags text[];

-- 5. Add columns to ai_usage
ALTER TABLE ai_usage
  ADD COLUMN IF NOT EXISTS response_time_ms integer,
  ADD COLUMN IF NOT EXISTS error_occurred boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS error_message text,
  ADD COLUMN IF NOT EXISTS admin_user_id uuid REFERENCES admin_users(id) ON DELETE SET NULL;

-- 6. Indexes for performance (some may exist from prior migrations)
CREATE INDEX IF NOT EXISTS ai_usage_model_idx ON ai_usage(model);
CREATE INDEX IF NOT EXISTS ai_usage_endpoint_idx ON ai_usage(endpoint);
CREATE INDEX IF NOT EXISTS ai_usage_admin_idx ON ai_usage(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_aaa_admin_user ON admin_ai_analyses(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_aaa_model ON admin_ai_analyses(model);
CREATE INDEX IF NOT EXISTS ai_daily_summary_date_idx ON ai_usage_daily_summary(summary_date);
CREATE INDEX IF NOT EXISTS ai_daily_summary_model_idx ON ai_usage_daily_summary(model);
CREATE INDEX IF NOT EXISTS ai_insights_type_idx ON ai_insights(insight_type);
CREATE INDEX IF NOT EXISTS ai_insights_created_idx ON ai_insights(created_at DESC);
