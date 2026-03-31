-- Migration 0037: Task enhancements
-- Adds: user_color, task checklists, co-assignees, linked document

-- 1. User identification color
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_color varchar(7) DEFAULT '#6366f1';

-- 2. Task: co-assignees (JSON array of user IDs) + linked document
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS co_assignee_ids jsonb DEFAULT '[]'::jsonb;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS linked_document_id uuid;

-- 3. Task checklists table
CREATE TABLE IF NOT EXISTS task_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  text varchar(500) NOT NULL,
  is_done boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_checklists_task_id ON task_checklists(task_id);
