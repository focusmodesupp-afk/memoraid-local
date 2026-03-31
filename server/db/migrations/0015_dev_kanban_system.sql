-- Development Kanban System
-- Tables for managing development tasks with JIRA-like features

-- Columns/Lists for the Kanban board
CREATE TABLE IF NOT EXISTS "dev_columns" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(64) NOT NULL,
  "position" integer NOT NULL,
  "color" varchar(32),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Development tasks
CREATE TABLE IF NOT EXISTS "dev_tasks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" varchar(255) NOT NULL,
  "description" text,
  "column_id" uuid REFERENCES "dev_columns"("id") ON DELETE SET NULL,
  "priority" varchar(16) DEFAULT 'medium' NOT NULL,
  "category" varchar(64),
  "assignee" varchar(255),
  "labels" text[],
  "estimate_hours" integer,
  "actual_hours" integer,
  "due_date" timestamp with time zone,
  "position" integer NOT NULL DEFAULT 0,
  "created_by" uuid REFERENCES "admin_users"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Task comments
CREATE TABLE IF NOT EXISTS "dev_comments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "task_id" uuid NOT NULL REFERENCES "dev_tasks"("id") ON DELETE CASCADE,
  "admin_user_id" uuid REFERENCES "admin_users"("id") ON DELETE SET NULL,
  "comment" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "dev_tasks_column_id_idx" ON "dev_tasks"("column_id");
CREATE INDEX IF NOT EXISTS "dev_tasks_priority_idx" ON "dev_tasks"("priority");
CREATE INDEX IF NOT EXISTS "dev_tasks_category_idx" ON "dev_tasks"("category");
CREATE INDEX IF NOT EXISTS "dev_tasks_assignee_idx" ON "dev_tasks"("assignee");
CREATE INDEX IF NOT EXISTS "dev_tasks_due_date_idx" ON "dev_tasks"("due_date");
CREATE INDEX IF NOT EXISTS "dev_comments_task_id_idx" ON "dev_comments"("task_id");
CREATE INDEX IF NOT EXISTS "dev_columns_position_idx" ON "dev_columns"("position");

-- Seed default columns
INSERT INTO "dev_columns" ("name", "position", "color") VALUES
  ('Backlog', 0, 'slate'),
  ('To Do', 1, 'blue'),
  ('In Progress', 2, 'amber'),
  ('QA', 3, 'purple'),
  ('Support', 4, 'cyan'),
  ('Done', 5, 'green')
ON CONFLICT DO NOTHING;
