-- Add rating columns to admin_ai_analyses
ALTER TABLE admin_ai_analyses
  ADD COLUMN IF NOT EXISTS output_quality   INTEGER     CHECK (output_quality IS NULL OR output_quality BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS dev_quality      INTEGER     CHECK (dev_quality IS NULL OR dev_quality BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS process_speed    VARCHAR(16) CHECK (process_speed IS NULL OR process_speed IN ('very_slow','slow','medium','fast','very_fast')),
  ADD COLUMN IF NOT EXISTS rated_at         TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS rated_by         UUID REFERENCES admin_users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_aaa_output_quality ON admin_ai_analyses(output_quality) WHERE output_quality IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_aaa_model_quality  ON admin_ai_analyses(model, output_quality) WHERE output_quality IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_aaa_admin_cost     ON admin_ai_analyses(admin_user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_aaa_created_at     ON admin_ai_analyses(created_at DESC);
