-- Sprint Management System (JIRA-style)

-- Sprints table
CREATE TABLE IF NOT EXISTS "sprints" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(255) NOT NULL,
  "goal" text,
  "start_date" timestamp with time zone NOT NULL,
  "end_date" timestamp with time zone NOT NULL,
  "status" varchar(32) DEFAULT 'planning' NOT NULL,
  "velocity" decimal(10, 2),
  "created_by" uuid REFERENCES "admin_users"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Sprint tasks (many-to-many relationship)
CREATE TABLE IF NOT EXISTS "sprint_tasks" (
  "sprint_id" uuid NOT NULL REFERENCES "sprints"("id") ON DELETE CASCADE,
  "task_id" uuid NOT NULL REFERENCES "dev_tasks"("id") ON DELETE CASCADE,
  "story_points" integer,
  "added_at" timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY ("sprint_id", "task_id")
);

-- Sprint activities (audit log)
CREATE TABLE IF NOT EXISTS "sprint_activities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "sprint_id" uuid NOT NULL REFERENCES "sprints"("id") ON DELETE CASCADE,
  "activity_type" varchar(64) NOT NULL,
  "description" text NOT NULL,
  "admin_user_id" uuid REFERENCES "admin_users"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "sprints_status_idx" ON "sprints"("status");
CREATE INDEX IF NOT EXISTS "sprints_start_date_idx" ON "sprints"("start_date");
CREATE INDEX IF NOT EXISTS "sprints_end_date_idx" ON "sprints"("end_date");
CREATE INDEX IF NOT EXISTS "sprint_tasks_sprint_id_idx" ON "sprint_tasks"("sprint_id");
CREATE INDEX IF NOT EXISTS "sprint_tasks_task_id_idx" ON "sprint_tasks"("task_id");
CREATE INDEX IF NOT EXISTS "sprint_activities_sprint_id_idx" ON "sprint_activities"("sprint_id");
CREATE INDEX IF NOT EXISTS "sprint_activities_created_at_idx" ON "sprint_activities"("created_at");
