DO $$ BEGIN
 CREATE TYPE "public"."allergen_type" AS ENUM('drug', 'food', 'environment', 'contrast', 'other');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."assessment_type" AS ENUM('adl', 'iadl', 'mmse', 'gds', 'falls_risk', 'pain', 'nutrition', 'frailty');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."diagnosis_status" AS ENUM('active', 'resolved', 'suspected', 'ruled_out');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."insight_severity" AS ENUM('info', 'warning', 'critical');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."nexus_brief_state" AS ENUM('draft', 'intake', 'setup', 'researching_round_1', 'awaiting_round_1_review', 'decision_review_round_1', 'researching_round_2', 'decision_review_round_2', 'researching_round_3', 'awaiting_round_3_review', 'decision_review_round_3', 'researching_round_4', 'decision_review_round_4', 'blocked_validation', 'awaiting_sprint_approval', 'approved_for_sprint', 'awaiting_prompt_review', 'exported', 'failed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."nexus_brief_status" AS ENUM('draft', 'researching', 'review', 'approved', 'rejected', 'in_progress', 'done');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."nexus_business_goal" AS ENUM('improve_ux', 'performance', 'sprints', 'research_quality', 'reduce_duplication', 'mvp', 'revenue', 'compliance', 'scalability');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."nexus_priority_level" AS ENUM('critical', 'high', 'medium', 'low');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."nexus_request_type" AS ENUM('feature', 'bug', 'redesign', 'ai_issue', 'feasibility', 'integration', 'security', 'performance', 'documentation');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."referral_status" AS ENUM('pending', 'scheduled', 'completed', 'cancelled', 'expired');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."vital_type" AS ENUM('blood_pressure', 'blood_sugar', 'weight', 'heart_rate', 'temperature', 'oxygen_saturation', 'respiratory_rate', 'pain_level');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admin_ai_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(32) NOT NULL,
	"query" text,
	"report" text NOT NULL,
	"depth" varchar(16),
	"scope" varchar(16),
	"model" varchar(64),
	"tokens_used" integer DEFAULT 0,
	"cost_usd" varchar(24) DEFAULT '0',
	"admin_user_id" uuid,
	"attached_file_ids" uuid[] DEFAULT '{}'::uuid[],
	"admin_full_name" varchar(255),
	"analysis_metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"output_quality" integer,
	"dev_quality" integer,
	"process_speed" varchar(16),
	"rated_at" timestamp with time zone,
	"rated_by" uuid,
	"response_time_ms" integer,
	"question_quality_score" integer,
	"resulted_in_tasks" boolean DEFAULT false,
	"task_count" integer DEFAULT 0,
	"use_case" varchar(64),
	"tags" text[]
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admin_coupon_meta" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stripe_promotion_code_id" varchar(255) NOT NULL,
	"source" varchar(32) DEFAULT 'other' NOT NULL,
	"campaign_name" varchar(255),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_coupon_meta_stripe_promotion_code_id_unique" UNIQUE("stripe_promotion_code_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admin_finance_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(16) NOT NULL,
	"category" varchar(64) NOT NULL,
	"name" varchar(255) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" varchar(8) DEFAULT 'ILS' NOT NULL,
	"recurrence" varchar(32) DEFAULT 'monthly' NOT NULL,
	"period_month" integer,
	"period_year" integer,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admin_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stripe_product_id" varchar(255),
	"stripe_price_id_monthly" varchar(255),
	"stripe_price_id_yearly" varchar(255),
	"slug" varchar(64) NOT NULL,
	"name_he" varchar(255) NOT NULL,
	"description_he" text,
	"features" jsonb DEFAULT '[]'::jsonb,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_plans_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admin_sessions" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"admin_user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"full_name" varchar(255),
	"role" varchar(32) DEFAULT 'support' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_analysis_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" uuid NOT NULL,
	"media_id" uuid,
	"file_role" varchar(64) DEFAULT 'context',
	"processing_method" varchar(64) DEFAULT 'vision',
	"tokens_used" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_insights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"insight_type" varchar(64) NOT NULL,
	"severity" varchar(16) DEFAULT 'info' NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"data" jsonb,
	"model_ref" varchar(64),
	"admin_ref" uuid,
	"is_read" boolean DEFAULT false,
	"is_dismissed" boolean DEFAULT false,
	"valid_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_model_benchmarks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model" varchar(64) NOT NULL,
	"benchmark_date" date NOT NULL,
	"speed_score" integer,
	"quality_score" integer,
	"cost_score" integer,
	"reliability_score" integer,
	"capability_score" integer,
	"composite_score" integer,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid,
	"user_id" uuid,
	"model" varchar(64) NOT NULL,
	"tokens_used" integer DEFAULT 0 NOT NULL,
	"cost_usd" varchar(16) DEFAULT '0',
	"endpoint" varchar(128),
	"response_time_ms" integer,
	"error_occurred" boolean DEFAULT false,
	"error_message" text,
	"admin_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_usage_daily_summary" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"summary_date" date NOT NULL,
	"model" varchar(64) NOT NULL,
	"endpoint" varchar(128),
	"admin_user_id" uuid,
	"total_calls" integer DEFAULT 0,
	"total_tokens" integer DEFAULT 0,
	"total_cost_usd" numeric(12, 6) DEFAULT '0',
	"avg_tokens_per_call" integer,
	"success_count" integer DEFAULT 0,
	"error_count" integer DEFAULT 0,
	"avg_quality_score" numeric(4, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "app_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" varchar(32) NOT NULL,
	"platform" varchar(16) DEFAULT 'web' NOT NULL,
	"release_notes" text,
	"released_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"family_id" uuid NOT NULL,
	"appointment_type" varchar(64),
	"doctor_name" varchar(255),
	"specialty" varchar(128),
	"location" varchar(255),
	"scheduled_at" timestamp with time zone,
	"status" varchar(32) DEFAULT 'scheduled' NOT NULL,
	"notes" text,
	"related_referral_id" uuid,
	"related_task_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_user_id" uuid,
	"user_id" uuid,
	"action" varchar(64) NOT NULL,
	"entity_type" varchar(64),
	"entity_id" uuid,
	"old_value" jsonb,
	"new_value" jsonb,
	"ip_address" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "content_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(128) NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text,
	"meta_description" text,
	"published" boolean DEFAULT false NOT NULL,
	"locale" varchar(8) DEFAULT 'he' NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_pages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dev_columns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(64) NOT NULL,
	"position" integer NOT NULL,
	"color" varchar(32),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dev_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"admin_user_id" uuid,
	"comment" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dev_phases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"goals" jsonb DEFAULT '[]'::jsonb,
	"tech_stack" jsonb DEFAULT '[]'::jsonb,
	"complexity" varchar(32),
	"ai_context" text,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"ai_analysis_result" jsonb,
	"total_cost_usd" numeric(10, 4),
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dev_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"column_id" uuid,
	"priority" varchar(16) DEFAULT 'medium' NOT NULL,
	"category" varchar(64),
	"assignee" varchar(255),
	"labels" text[],
	"estimate_hours" integer,
	"actual_hours" integer,
	"due_date" timestamp with time zone,
	"position" integer DEFAULT 0 NOT NULL,
	"sprint_id" uuid,
	"phase_id" uuid,
	"target_file" varchar(500),
	"estimated_tokens" integer DEFAULT 0,
	"depends_on" jsonb DEFAULT '[]'::jsonb,
	"environment" varchar(16) DEFAULT 'admin',
	"ai_generated" boolean DEFAULT false NOT NULL,
	"cursor_prompt_snippet" text,
	"verification_steps" jsonb DEFAULT '[]'::jsonb,
	"risk_level" varchar(32),
	"nexus_context" jsonb,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "error_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"level" varchar(16) DEFAULT 'error' NOT NULL,
	"message" text NOT NULL,
	"stack_trace" text,
	"context" jsonb,
	"user_id" uuid,
	"family_id" uuid,
	"url" text,
	"user_agent" text,
	"ip_address" varchar(64),
	"resolved" boolean DEFAULT false NOT NULL,
	"resolved_by" uuid,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "family_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"code" varchar(24) NOT NULL,
	"slot" varchar(16),
	"role" "user_role" DEFAULT 'viewer' NOT NULL,
	"member_tier" varchar(32) DEFAULT 'supporter_friend',
	"permissions" jsonb DEFAULT '[]'::jsonb,
	"email_optional" varchar(255),
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "family_invites_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "family_members" (
	"user_id" uuid NOT NULL,
	"family_id" uuid NOT NULL,
	"role" "user_role" DEFAULT 'viewer' NOT NULL,
	"member_tier" varchar(32) DEFAULT 'family',
	"permissions" jsonb DEFAULT '[]'::jsonb,
	"invited_by" uuid,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "family_members_user_id_family_id_pk" PRIMARY KEY("user_id","family_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "feature_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(64) NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"description" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feature_flags_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lab_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"family_id" uuid NOT NULL,
	"test_name" varchar(255) NOT NULL,
	"value" varchar(64) NOT NULL,
	"unit" varchar(32),
	"reference_range_low" varchar(32),
	"reference_range_high" varchar(32),
	"is_abnormal" boolean DEFAULT false,
	"test_date" date,
	"ordering_doctor" varchar(255),
	"lab_name" varchar(255),
	"source_document_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "media_library" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filename" varchar(255) NOT NULL,
	"original_name" varchar(255) NOT NULL,
	"mime_type" varchar(64),
	"size_bytes" integer,
	"url" text NOT NULL,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "medical_brain_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid,
	"rule_type" varchar(64) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"trigger_condition" jsonb NOT NULL,
	"actions" jsonb NOT NULL,
	"is_active" boolean DEFAULT true,
	"priority" integer DEFAULT 50,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "medical_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"patient_id" uuid,
	"user_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"document_type" varchar(64),
	"file_url" text,
	"ai_analysis_status" varchar(32),
	"ai_analysis_result" jsonb,
	"extracted_medications" jsonb,
	"extracted_tasks" jsonb,
	"simplified_diagnosis" text,
	"document_date" date,
	"issuing_doctor" varchar(255),
	"hospital_name" varchar(255),
	"extracted_referrals" jsonb,
	"extracted_lab_values" jsonb,
	"extracted_vitals" jsonb,
	"sync_status" varchar(32),
	"sync_completed_at" timestamp with time zone,
	"is_archive_only" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "medications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"family_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"generic_name" varchar(255),
	"dosage" varchar(64),
	"frequency" varchar(64),
	"timing" jsonb,
	"start_date" date,
	"end_date" date,
	"prescribing_doctor" varchar(255),
	"is_active" boolean DEFAULT true,
	"source_document_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "memory_stories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"patient_id" uuid,
	"user_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text,
	"image_url" text,
	"occurred_at" timestamp with time zone,
	"location" varchar(255),
	"emotional_tone" varchar(32),
	"tags" jsonb,
	"ai_insight" text,
	"is_reported_to_doctor" boolean DEFAULT false,
	"severity" integer,
	"care_stage" varchar(32),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nexus_admin_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_user_id" uuid NOT NULL,
	"role" varchar(32) NOT NULL,
	"granted_by" uuid,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nexus_analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" varchar(64) NOT NULL,
	"brief_id" uuid,
	"intake_id" uuid,
	"admin_user_id" uuid,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"request_type" varchar(32),
	"department_context" varchar(32),
	"round_number" integer,
	"duration_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nexus_brief_departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brief_id" uuid NOT NULL,
	"department" varchar(32) NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"output" text,
	"model_used" varchar(64),
	"tokens_used" integer DEFAULT 0,
	"cost_usd" varchar(24) DEFAULT '0',
	"error_message" text,
	"prompt_snapshot" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nexus_brief_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brief_id" uuid NOT NULL,
	"department" varchar(32) NOT NULL,
	"gate" varchar(16) NOT NULL,
	"role" varchar(64),
	"question" text NOT NULL,
	"answer" text,
	"answer_source" varchar(32),
	"source_url" text,
	"confidence" integer DEFAULT 0 NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"processing_status" varchar(16) DEFAULT 'pending',
	"failed_reason" varchar(32),
	"retry_count" integer DEFAULT 0 NOT NULL,
	"last_attempt_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nexus_brief_round_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brief_id" uuid NOT NULL,
	"round_id" uuid NOT NULL,
	"team_member_id" uuid,
	"department" varchar(32) NOT NULL,
	"employee_name" varchar(128),
	"employee_role" varchar(128),
	"employee_level" varchar(16),
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"output" text,
	"output_json" jsonb,
	"prompt_snapshot" text,
	"model_used" varchar(64),
	"tokens_used" integer DEFAULT 0,
	"cost_usd" varchar(16) DEFAULT '0',
	"error_message" text,
	"web_sources_used" integer DEFAULT 0,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nexus_brief_rounds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brief_id" uuid NOT NULL,
	"round_number" integer NOT NULL,
	"round_type" varchar(32) NOT NULL,
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"synthesis_output" text,
	"synthesis_model" varchar(64),
	"synthesis_tokens" integer DEFAULT 0,
	"synthesis_cost_usd" varchar(16) DEFAULT '0',
	"synthesis_status" varchar(16) DEFAULT 'pending',
	"admin_edited_synthesis" text,
	"review_notes" text,
	"approved_at" timestamp with time zone,
	"approved_by" uuid,
	"participant_count" integer DEFAULT 0,
	"completed_count" integer DEFAULT 0,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"decision_review_id" uuid,
	"approved_findings_json" jsonb,
	"filtered_synthesis" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nexus_brief_web_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brief_id" uuid NOT NULL,
	"source_type" varchar(32) NOT NULL,
	"url" text,
	"title" varchar(500),
	"snippet" text,
	"trust_score" integer DEFAULT 0,
	"github_stars" integer,
	"reddit_score" integer,
	"contributor_count" integer,
	"raw_payload" jsonb,
	"department" varchar(32),
	"team_member_id" uuid,
	"round_number" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nexus_briefs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(500) NOT NULL,
	"idea_prompt" text NOT NULL,
	"status" "nexus_brief_status" DEFAULT 'draft' NOT NULL,
	"selected_departments" text[] DEFAULT '{}'::text[] NOT NULL,
	"selected_models" varchar(32)[] DEFAULT '{}'::varchar(32)[] NOT NULL,
	"assembled_brief" text,
	"review_notes" text,
	"context_notes" text,
	"target_platforms" text[] DEFAULT '{}'::text[] NOT NULL,
	"codebase_depth" varchar(16) DEFAULT 'deep',
	"codebase_scope" varchar(16) DEFAULT 'all',
	"total_cost_usd" varchar(24) DEFAULT '0',
	"total_tokens_used" integer DEFAULT 0,
	"admin_user_id" uuid,
	"admin_full_name" varchar(255),
	"research_started_at" timestamp with time zone,
	"research_completed_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"approved_by" uuid,
	"generated_sprint_id" uuid,
	"phase_id" uuid,
	"template_id" uuid,
	"research_mode" varchar(16) DEFAULT 'quick',
	"current_round" integer DEFAULT 0,
	"round_1_synthesis" text,
	"round_2_synthesis" text,
	"round_3_synthesis" text,
	"round_4_synthesis" text,
	"intake_id" uuid,
	"request_type" varchar(32),
	"business_goal" varchar(32),
	"brief_priority" varchar(16),
	"affected_systems" text[] DEFAULT '{}'::text[] NOT NULL,
	"constraints" text[] DEFAULT '{}'::text[] NOT NULL,
	"target_audience" text[] DEFAULT '{}'::text[] NOT NULL,
	"risk_description" text,
	"setup_source" varchar(16) DEFAULT 'manual',
	"brief_state" "nexus_brief_state" DEFAULT 'draft',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nexus_cancelled_archive" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brief_id" uuid,
	"decision_item_id" uuid,
	"title" varchar(500) NOT NULL,
	"description" text,
	"cancel_reason" text,
	"source_round" integer,
	"source_department" varchar(32),
	"can_reopen" boolean DEFAULT true NOT NULL,
	"status" varchar(16) DEFAULT 'cancelled' NOT NULL,
	"admin_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nexus_decision_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid,
	"item_id" uuid,
	"action" varchar(32) NOT NULL,
	"from_decision" varchar(32),
	"to_decision" varchar(32),
	"reason" text,
	"admin_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nexus_decision_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid NOT NULL,
	"brief_id" uuid NOT NULL,
	"parent_item_id" uuid,
	"item_index" integer DEFAULT 0 NOT NULL,
	"item_title" varchar(500) NOT NULL,
	"item_summary" text,
	"source_department" varchar(32),
	"source_employee" varchar(255),
	"decision" varchar(32),
	"reason" text,
	"reason_category" varchar(32),
	"routed_to" varchar(32),
	"revision_spec" jsonb,
	"admin_user_id" uuid,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nexus_decision_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brief_id" uuid NOT NULL,
	"round_id" uuid NOT NULL,
	"round_number" integer NOT NULL,
	"gate_type" varchar(32) DEFAULT 'progression_decision' NOT NULL,
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"overall_decision" varchar(32),
	"workflow_action" varchar(32),
	"decision_summary" text,
	"approved_count" integer DEFAULT 0,
	"rejected_count" integer DEFAULT 0,
	"deferred_count" integer DEFAULT 0,
	"admin_user_id" uuid,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nexus_dept_knowledge" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"department" varchar(32) NOT NULL,
	"category" varchar(32) NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nexus_dept_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"department" varchar(32) NOT NULL,
	"label_he" varchar(64) NOT NULL,
	"emoji" varchar(8) DEFAULT '🏢' NOT NULL,
	"system_prompt_override" text,
	"default_model" varchar(64),
	"is_active" boolean DEFAULT true NOT NULL,
	"output_sections" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "nexus_dept_settings_department_unique" UNIQUE("department")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nexus_dept_team_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"department" text NOT NULL,
	"name" text NOT NULL,
	"role_en" text NOT NULL,
	"role_he" text NOT NULL,
	"emoji" text DEFAULT '👤' NOT NULL,
	"level" text DEFAULT 'member' NOT NULL,
	"responsibilities" text,
	"skills" text[],
	"default_model" text,
	"system_prompt_override" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"bio" text,
	"experience_years" integer,
	"education" text,
	"certifications" text[],
	"domain_expertise" text[],
	"languages" text[],
	"methodology" text,
	"personality" text,
	"achievements" text,
	"background" text,
	"work_history" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nexus_extracted_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brief_id" uuid NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"priority" varchar(16) DEFAULT 'medium' NOT NULL,
	"estimate_hours" integer DEFAULT 4,
	"category" varchar(32) DEFAULT 'feature',
	"skill_tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"source_department" varchar(32),
	"environment" varchar(16) DEFAULT 'admin',
	"accepted" boolean DEFAULT true NOT NULL,
	"dev_task_id" uuid,
	"sprint_id" uuid,
	"phase_id" uuid,
	"position" integer DEFAULT 0 NOT NULL,
	"context_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nexus_future_backlog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brief_id" uuid,
	"decision_item_id" uuid,
	"title" varchar(500) NOT NULL,
	"description" text,
	"source_round" integer,
	"source_department" varchar(32),
	"priority" varchar(16),
	"re_evaluate_date" timestamp with time zone,
	"status" varchar(16) DEFAULT 'parked' NOT NULL,
	"admin_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nexus_idea_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idea_id" uuid NOT NULL,
	"author_type" varchar(16) NOT NULL,
	"author_name" varchar(128),
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nexus_ideas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"category" varchar(32) DEFAULT 'feature',
	"source_type" varchar(16) NOT NULL,
	"source_brief_id" uuid,
	"source_department" varchar(32),
	"source_employee_name" varchar(128),
	"source_round" integer,
	"priority" varchar(16) DEFAULT 'medium',
	"score" integer DEFAULT 0,
	"upvotes" integer DEFAULT 0,
	"downvotes" integer DEFAULT 0,
	"voted_by" jsonb DEFAULT '[]'::jsonb,
	"ceo_recommendation" varchar(32),
	"executive_notes" text,
	"status" varchar(16) DEFAULT 'new',
	"target_quarter" varchar(8),
	"estimated_hours" integer,
	"estimated_cost" varchar(16),
	"affected_environment" varchar(16),
	"affected_files" text[] DEFAULT '{}'::text[],
	"tags" text[] DEFAULT '{}'::text[],
	"sprint_id" uuid,
	"brief_id_created_from" uuid,
	"related_idea_ids" uuid[] DEFAULT '{}'::uuid[],
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nexus_intake_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_type" "nexus_request_type" NOT NULL,
	"business_goal" "nexus_business_goal" NOT NULL,
	"affected_systems" text[] DEFAULT '{}'::text[] NOT NULL,
	"priority" "nexus_priority_level" DEFAULT 'medium' NOT NULL,
	"constraints" text[] DEFAULT '{}'::text[] NOT NULL,
	"target_audience" text[] DEFAULT '{}'::text[] NOT NULL,
	"risk_description" text,
	"dynamic_answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"free_text_description" text,
	"brief_id" uuid,
	"ai_recommendation" jsonb,
	"ai_recommendation_accepted" boolean DEFAULT false NOT NULL,
	"wizard_step" integer DEFAULT 1 NOT NULL,
	"wizard_completed" boolean DEFAULT false NOT NULL,
	"wizard_abandoned_at" timestamp with time zone,
	"admin_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nexus_question_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"department" varchar(32) NOT NULL,
	"gate" varchar(16) NOT NULL,
	"role" varchar(64),
	"question" text NOT NULL,
	"answer_strategy" varchar(32) NOT NULL,
	"priority" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nexus_round_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brief_id" uuid NOT NULL,
	"round_id" uuid NOT NULL,
	"round_number" integer NOT NULL,
	"snapshot_type" varchar(32) NOT NULL,
	"content" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nexus_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"trigger_type" varchar(64) NOT NULL,
	"condition_json" jsonb NOT NULL,
	"action_type" varchar(64) NOT NULL,
	"action_payload" jsonb,
	"priority" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nexus_skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(64) NOT NULL,
	"label_he" varchar(64) NOT NULL,
	"color" varchar(7) DEFAULT '#6366f1' NOT NULL,
	"category" varchar(32) DEFAULT 'tech' NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "nexus_skills_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nexus_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"name_he" varchar(255) NOT NULL,
	"description" text,
	"departments" text[] DEFAULT '{}'::text[] NOT NULL,
	"models" varchar(32)[] DEFAULT '{}'::varchar(32)[] NOT NULL,
	"codebase_depth" varchar(16) DEFAULT 'deep' NOT NULL,
	"codebase_scope" varchar(16) DEFAULT 'all' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nexus_web_feeds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_type" text NOT NULL,
	"url" text NOT NULL,
	"label" text NOT NULL,
	"category" text DEFAULT 'tech' NOT NULL,
	"departments" text[],
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "nexus_web_feeds_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_preferences" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"push_enabled" boolean DEFAULT true NOT NULL,
	"email_enabled" boolean DEFAULT true NOT NULL,
	"whatsapp_enabled" boolean DEFAULT false NOT NULL,
	"sms_enabled" boolean DEFAULT false NOT NULL,
	"quiet_hours_enabled" boolean DEFAULT false NOT NULL,
	"quiet_hours_start" varchar(5) DEFAULT '22:00',
	"quiet_hours_end" varchar(5) DEFAULT '07:00',
	"min_severity" varchar(32) DEFAULT 'info',
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" text,
	"type" varchar(32) DEFAULT 'info',
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" varchar(128) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "patient_allergies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"family_id" uuid NOT NULL,
	"allergen" varchar(255) NOT NULL,
	"allergen_type" "allergen_type" DEFAULT 'other',
	"reaction" text,
	"severity" varchar(32),
	"confirmed_date" date,
	"status" varchar(16) DEFAULT 'active' NOT NULL,
	"source_document_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "patient_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"family_id" uuid NOT NULL,
	"assessment_type" "assessment_type" NOT NULL,
	"score" integer NOT NULL,
	"max_score" integer,
	"details" jsonb,
	"interpretation" text,
	"assessed_by_user_id" uuid,
	"assessed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"next_assessment_due" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "patient_diagnoses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"family_id" uuid NOT NULL,
	"condition" varchar(255) NOT NULL,
	"icd_code" varchar(16),
	"diagnosed_date" date,
	"status" "diagnosis_status" DEFAULT 'active' NOT NULL,
	"severity" varchar(16),
	"notes" text,
	"source_document_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "patient_health_insights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"family_id" uuid NOT NULL,
	"source_document_id" uuid,
	"insight_type" varchar(64) NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"severity" "insight_severity" DEFAULT 'info' NOT NULL,
	"status" varchar(32) DEFAULT 'new' NOT NULL,
	"acknowledged_by_user_id" uuid,
	"acknowledged_at" timestamp with time zone,
	"related_entity_type" varchar(32),
	"related_entity_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pipeline_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pipeline_id" uuid NOT NULL,
	"run_id" uuid,
	"alert_type" varchar(64) NOT NULL,
	"severity" varchar(32) NOT NULL,
	"message" text NOT NULL,
	"resolved" boolean DEFAULT false NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pipeline_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pipeline_id" uuid NOT NULL,
	"status" varchar(32) DEFAULT 'running' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"duration_ms" integer,
	"records_processed" integer,
	"records_success" integer,
	"records_failed" integer,
	"error_message" text,
	"logs" jsonb,
	"triggered_by" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pipeline_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pipeline_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"stage_order" integer NOT NULL,
	"stage_type" varchar(64) NOT NULL,
	"config" jsonb,
	"timeout_seconds" integer DEFAULT 300,
	"retry_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pipelines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"type" varchar(64) NOT NULL,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"config" jsonb,
	"schedule" varchar(128),
	"last_run" timestamp with time zone,
	"next_run" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "professionals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" varchar(32) DEFAULT 'medical' NOT NULL,
	"specialty" varchar(128),
	"clinic_or_company" varchar(255),
	"phone" varchar(64),
	"fax" varchar(64),
	"email" varchar(255),
	"address" text,
	"website" varchar(255),
	"notes" text,
	"linked_document_ids" jsonb DEFAULT '[]'::jsonb,
	"last_interaction_date" date,
	"source" varchar(32) DEFAULT 'manual',
	"name_normalized" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "questionnaire_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"questionnaire_id" uuid NOT NULL,
	"family_id" uuid NOT NULL,
	"patient_id" uuid,
	"user_id" uuid NOT NULL,
	"answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "questionnaires" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"questions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "referrals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"family_id" uuid NOT NULL,
	"specialty" varchar(128) NOT NULL,
	"reason" text NOT NULL,
	"urgency" varchar(16) DEFAULT 'routine' NOT NULL,
	"status" "referral_status" DEFAULT 'pending' NOT NULL,
	"referring_doctor" varchar(255),
	"scheduled_date" date,
	"completed_date" date,
	"notes" text,
	"source_document_id" uuid,
	"linked_task_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rights_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(64) NOT NULL,
	"title_he" varchar(255) NOT NULL,
	"title_en" varchar(255),
	"description_he" text,
	"description_en" text,
	"icon" varchar(32),
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rights_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rights_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"family_id" uuid NOT NULL,
	"category_slug" varchar(64),
	"notes" text,
	"status" varchar(32) DEFAULT 'pending',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sprint_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sprint_id" uuid NOT NULL,
	"activity_type" varchar(64) NOT NULL,
	"description" text NOT NULL,
	"admin_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sprint_tasks" (
	"sprint_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"story_points" integer,
	"task_order" integer DEFAULT 0 NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sprint_tasks_sprint_id_task_id_pk" PRIMARY KEY("sprint_id","task_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sprints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"goal" text,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone NOT NULL,
	"status" varchar(32) DEFAULT 'planning' NOT NULL,
	"velocity" numeric(10, 2),
	"phase_id" uuid,
	"estimated_tokens" integer,
	"estimated_cost_usd" numeric(10, 4),
	"cursor_prompt" text,
	"risk_level" varchar(32),
	"sprint_order" integer DEFAULT 0 NOT NULL,
	"brief_id" uuid,
	"retrospective_notes" text,
	"retrospective_completed_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sync_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"patient_id" uuid,
	"source_type" varchar(32) NOT NULL,
	"source_id" uuid NOT NULL,
	"target_type" varchar(32) NOT NULL,
	"target_id" uuid,
	"action" varchar(32) NOT NULL,
	"triggered_by" varchar(64) DEFAULT 'ai' NOT NULL,
	"metadata" jsonb,
	"old_value" jsonb,
	"new_value" jsonb,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "task_calendar_sync" (
	"task_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"calendar_event_id" varchar(255) NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_calendar_sync_task_id_user_id_pk" PRIMARY KEY("task_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "task_checklists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"text" varchar(500) NOT NULL,
	"is_done" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_google_calendar_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text NOT NULL,
	"expires_at" timestamp with time zone,
	"calendar_id" varchar(255) DEFAULT 'primary',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_google_calendar_tokens_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"dark_mode" boolean DEFAULT false NOT NULL,
	"weight_unit" varchar(8) DEFAULT 'kg',
	"volume_unit" varchar(8) DEFAULT 'ml',
	"prescription_reminder" boolean DEFAULT true NOT NULL,
	"missed_dose_alert" boolean DEFAULT true NOT NULL,
	"abnormal_measurements_alert" boolean DEFAULT true NOT NULL,
	"reminder_channel" varchar(32) DEFAULT 'push',
	"push_channel" varchar(32) DEFAULT 'browser',
	"dnd_start" varchar(5),
	"dnd_end" varchar(5),
	"whatsapp_phone" varchar(32),
	"whatsapp_enabled" boolean DEFAULT false NOT NULL,
	"whatsapp_medication" boolean DEFAULT false NOT NULL,
	"whatsapp_vitals" boolean DEFAULT false NOT NULL,
	"whatsapp_drink" boolean DEFAULT false NOT NULL,
	"whatsapp_appointments" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vitals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"family_id" uuid NOT NULL,
	"type" "vital_type" NOT NULL,
	"value" numeric(10, 2) NOT NULL,
	"value2" numeric(10, 2),
	"unit" varchar(32) NOT NULL,
	"is_abnormal" boolean DEFAULT false,
	"notes" text,
	"source_document_id" uuid,
	"recorded_by_user_id" uuid,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "profile_completion_score" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "onboarding_step" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "insurance_number" text;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "blood_type" varchar(8);--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "mobility_status" varchar(32);--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "cognitive_status" varchar(32);--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "care_level" varchar(32);--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "last_assessment_date" date;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "adl_score" integer;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "iadl_score" integer;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "fall_risk_level" varchar(16);--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "pain_level" integer;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "nutrition_status" varchar(32);--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "height" numeric(5, 1);--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "weight" numeric(6, 2);--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "specialists" jsonb;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "sdoh_factors" jsonb;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "vaccination_history" jsonb;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "last_hospitalization_date" date;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "advance_directives" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "advance_directives_notes" text;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "dnr_status" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "care_stage" varchar(32) DEFAULT 'suspicion';--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "stage_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "family_history" jsonb;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "scheduled_start" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "scheduled_end" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "source_entity_type" varchar(32);--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "source_entity_id" uuid;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "linked_referral_id" uuid;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "linked_document_ids" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "co_assignee_ids" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "primary_family_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "family_role" varchar(32);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "family_roles" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "influence_areas" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "proximity" varchar(16);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "availability" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "user_color" varchar(7) DEFAULT '#6366f1';--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "admin_ai_analyses" ADD CONSTRAINT "admin_ai_analyses_admin_user_id_admin_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "admin_ai_analyses" ADD CONSTRAINT "admin_ai_analyses_rated_by_admin_users_id_fk" FOREIGN KEY ("rated_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "admin_finance_entries" ADD CONSTRAINT "admin_finance_entries_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_admin_user_id_admin_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_analysis_attachments" ADD CONSTRAINT "ai_analysis_attachments_analysis_id_admin_ai_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."admin_ai_analyses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_analysis_attachments" ADD CONSTRAINT "ai_analysis_attachments_media_id_media_library_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media_library"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_insights" ADD CONSTRAINT "ai_insights_admin_ref_admin_users_id_fk" FOREIGN KEY ("admin_ref") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_model_benchmarks" ADD CONSTRAINT "ai_model_benchmarks_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_admin_user_id_admin_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_usage_daily_summary" ADD CONSTRAINT "ai_usage_daily_summary_admin_user_id_admin_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointments" ADD CONSTRAINT "appointments_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointments" ADD CONSTRAINT "appointments_related_referral_id_referrals_id_fk" FOREIGN KEY ("related_referral_id") REFERENCES "public"."referrals"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointments" ADD CONSTRAINT "appointments_related_task_id_tasks_id_fk" FOREIGN KEY ("related_task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_admin_user_id_admin_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "content_pages" ADD CONSTRAINT "content_pages_updated_by_admin_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dev_comments" ADD CONSTRAINT "dev_comments_task_id_dev_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."dev_tasks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dev_comments" ADD CONSTRAINT "dev_comments_admin_user_id_admin_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dev_tasks" ADD CONSTRAINT "dev_tasks_column_id_dev_columns_id_fk" FOREIGN KEY ("column_id") REFERENCES "public"."dev_columns"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dev_tasks" ADD CONSTRAINT "dev_tasks_sprint_id_sprints_id_fk" FOREIGN KEY ("sprint_id") REFERENCES "public"."sprints"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dev_tasks" ADD CONSTRAINT "dev_tasks_phase_id_dev_phases_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."dev_phases"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dev_tasks" ADD CONSTRAINT "dev_tasks_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "error_logs" ADD CONSTRAINT "error_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "error_logs" ADD CONSTRAINT "error_logs_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "error_logs" ADD CONSTRAINT "error_logs_resolved_by_admin_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "family_invites" ADD CONSTRAINT "family_invites_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "family_members" ADD CONSTRAINT "family_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "family_members" ADD CONSTRAINT "family_members_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "family_members" ADD CONSTRAINT "family_members_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_source_document_id_medical_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."medical_documents"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "media_library" ADD CONSTRAINT "media_library_uploaded_by_admin_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "medical_brain_rules" ADD CONSTRAINT "medical_brain_rules_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "medical_brain_rules" ADD CONSTRAINT "medical_brain_rules_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "medical_documents" ADD CONSTRAINT "medical_documents_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "medical_documents" ADD CONSTRAINT "medical_documents_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "medical_documents" ADD CONSTRAINT "medical_documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "medications" ADD CONSTRAINT "medications_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "medications" ADD CONSTRAINT "medications_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "medications" ADD CONSTRAINT "medications_source_document_id_medical_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."medical_documents"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "memory_stories" ADD CONSTRAINT "memory_stories_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "memory_stories" ADD CONSTRAINT "memory_stories_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "memory_stories" ADD CONSTRAINT "memory_stories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nexus_admin_roles" ADD CONSTRAINT "nexus_admin_roles_admin_user_id_admin_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nexus_admin_roles" ADD CONSTRAINT "nexus_admin_roles_granted_by_admin_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nexus_analytics_events" ADD CONSTRAINT "nexus_analytics_events_brief_id_nexus_briefs_id_fk" FOREIGN KEY ("brief_id") REFERENCES "public"."nexus_briefs"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nexus_analytics_events" ADD CONSTRAINT "nexus_analytics_events_intake_id_nexus_intake_submissions_id_fk" FOREIGN KEY ("intake_id") REFERENCES "public"."nexus_intake_submissions"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nexus_analytics_events" ADD CONSTRAINT "nexus_analytics_events_admin_user_id_admin_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nexus_brief_departments" ADD CONSTRAINT "nexus_brief_departments_brief_id_nexus_briefs_id_fk" FOREIGN KEY ("brief_id") REFERENCES "public"."nexus_briefs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nexus_brief_questions" ADD CONSTRAINT "nexus_brief_questions_brief_id_nexus_briefs_id_fk" FOREIGN KEY ("brief_id") REFERENCES "public"."nexus_briefs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nexus_brief_round_results" ADD CONSTRAINT "nexus_brief_round_results_brief_id_nexus_briefs_id_fk" FOREIGN KEY ("brief_id") REFERENCES "public"."nexus_briefs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nexus_brief_round_results" ADD CONSTRAINT "nexus_brief_round_results_round_id_nexus_brief_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."nexus_brief_rounds"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nexus_brief_rounds" ADD CONSTRAINT "nexus_brief_rounds_brief_id_nexus_briefs_id_fk" FOREIGN KEY ("brief_id") REFERENCES "public"."nexus_briefs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nexus_brief_web_sources" ADD CONSTRAINT "nexus_brief_web_sources_brief_id_nexus_briefs_id_fk" FOREIGN KEY ("brief_id") REFERENCES "public"."nexus_briefs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nexus_briefs" ADD CONSTRAINT "nexus_briefs_admin_user_id_admin_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nexus_briefs" ADD CONSTRAINT "nexus_briefs_approved_by_admin_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nexus_cancelled_archive" ADD CONSTRAINT "nexus_cancelled_archive_brief_id_nexus_briefs_id_fk" FOREIGN KEY ("brief_id") REFERENCES "public"."nexus_briefs"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nexus_cancelled_archive" ADD CONSTRAINT "nexus_cancelled_archive_decision_item_id_nexus_decision_items_id_fk" FOREIGN KEY ("decision_item_id") REFERENCES "public"."nexus_decision_items"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nexus_cancelled_archive" ADD CONSTRAINT "nexus_cancelled_archive_admin_user_id_admin_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nexus_decision_history" ADD CONSTRAINT "nexus_decision_history_review_id_nexus_decision_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."nexus_decision_reviews"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nexus_decision_history" ADD CONSTRAINT "nexus_decision_history_item_id_nexus_decision_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."nexus_decision_items"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nexus_decision_history" ADD CONSTRAINT "nexus_decision_history_admin_user_id_admin_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nexus_decision_items" ADD CONSTRAINT "nexus_decision_items_review_id_nexus_decision_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."nexus_decision_reviews"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nexus_decision_items" ADD CONSTRAINT "nexus_decision_items_brief_id_nexus_briefs_id_fk" FOREIGN KEY ("brief_id") REFERENCES "public"."nexus_briefs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nexus_decision_items" ADD CONSTRAINT "nexus_decision_items_admin_user_id_admin_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nexus_decision_reviews" ADD CONSTRAINT "nexus_decision_reviews_brief_id_nexus_briefs_id_fk" FOREIGN KEY ("brief_id") REFERENCES "public"."nexus_briefs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nexus_decision_reviews" ADD CONSTRAINT "nexus_decision_reviews_round_id_nexus_brief_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."nexus_brief_rounds"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nexus_decision_reviews" ADD CONSTRAINT "nexus_decision_reviews_admin_user_id_admin_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nexus_extracted_tasks" ADD CONSTRAINT "nexus_extracted_tasks_brief_id_nexus_briefs_id_fk" FOREIGN KEY ("brief_id") REFERENCES "public"."nexus_briefs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nexus_future_backlog" ADD CONSTRAINT "nexus_future_backlog_brief_id_nexus_briefs_id_fk" FOREIGN KEY ("brief_id") REFERENCES "public"."nexus_briefs"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nexus_future_backlog" ADD CONSTRAINT "nexus_future_backlog_decision_item_id_nexus_decision_items_id_fk" FOREIGN KEY ("decision_item_id") REFERENCES "public"."nexus_decision_items"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nexus_future_backlog" ADD CONSTRAINT "nexus_future_backlog_admin_user_id_admin_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nexus_idea_comments" ADD CONSTRAINT "nexus_idea_comments_idea_id_nexus_ideas_id_fk" FOREIGN KEY ("idea_id") REFERENCES "public"."nexus_ideas"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nexus_ideas" ADD CONSTRAINT "nexus_ideas_source_brief_id_nexus_briefs_id_fk" FOREIGN KEY ("source_brief_id") REFERENCES "public"."nexus_briefs"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nexus_ideas" ADD CONSTRAINT "nexus_ideas_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nexus_intake_submissions" ADD CONSTRAINT "nexus_intake_submissions_brief_id_nexus_briefs_id_fk" FOREIGN KEY ("brief_id") REFERENCES "public"."nexus_briefs"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nexus_intake_submissions" ADD CONSTRAINT "nexus_intake_submissions_admin_user_id_admin_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nexus_round_snapshots" ADD CONSTRAINT "nexus_round_snapshots_brief_id_nexus_briefs_id_fk" FOREIGN KEY ("brief_id") REFERENCES "public"."nexus_briefs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nexus_round_snapshots" ADD CONSTRAINT "nexus_round_snapshots_round_id_nexus_brief_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."nexus_brief_rounds"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "patient_allergies" ADD CONSTRAINT "patient_allergies_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "patient_allergies" ADD CONSTRAINT "patient_allergies_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "patient_allergies" ADD CONSTRAINT "patient_allergies_source_document_id_medical_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."medical_documents"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "patient_assessments" ADD CONSTRAINT "patient_assessments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "patient_assessments" ADD CONSTRAINT "patient_assessments_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "patient_assessments" ADD CONSTRAINT "patient_assessments_assessed_by_user_id_users_id_fk" FOREIGN KEY ("assessed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "patient_diagnoses" ADD CONSTRAINT "patient_diagnoses_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "patient_diagnoses" ADD CONSTRAINT "patient_diagnoses_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "patient_diagnoses" ADD CONSTRAINT "patient_diagnoses_source_document_id_medical_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."medical_documents"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "patient_health_insights" ADD CONSTRAINT "patient_health_insights_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "patient_health_insights" ADD CONSTRAINT "patient_health_insights_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "patient_health_insights" ADD CONSTRAINT "patient_health_insights_source_document_id_medical_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."medical_documents"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "patient_health_insights" ADD CONSTRAINT "patient_health_insights_acknowledged_by_user_id_users_id_fk" FOREIGN KEY ("acknowledged_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pipeline_alerts" ADD CONSTRAINT "pipeline_alerts_pipeline_id_pipelines_id_fk" FOREIGN KEY ("pipeline_id") REFERENCES "public"."pipelines"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pipeline_alerts" ADD CONSTRAINT "pipeline_alerts_run_id_pipeline_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."pipeline_runs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pipeline_alerts" ADD CONSTRAINT "pipeline_alerts_resolved_by_admin_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pipeline_runs" ADD CONSTRAINT "pipeline_runs_pipeline_id_pipelines_id_fk" FOREIGN KEY ("pipeline_id") REFERENCES "public"."pipelines"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pipeline_runs" ADD CONSTRAINT "pipeline_runs_triggered_by_admin_users_id_fk" FOREIGN KEY ("triggered_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pipeline_stages" ADD CONSTRAINT "pipeline_stages_pipeline_id_pipelines_id_fk" FOREIGN KEY ("pipeline_id") REFERENCES "public"."pipelines"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pipelines" ADD CONSTRAINT "pipelines_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "professionals" ADD CONSTRAINT "professionals_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "questionnaire_responses" ADD CONSTRAINT "questionnaire_responses_questionnaire_id_questionnaires_id_fk" FOREIGN KEY ("questionnaire_id") REFERENCES "public"."questionnaires"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "questionnaire_responses" ADD CONSTRAINT "questionnaire_responses_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "questionnaire_responses" ADD CONSTRAINT "questionnaire_responses_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "questionnaire_responses" ADD CONSTRAINT "questionnaire_responses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "referrals" ADD CONSTRAINT "referrals_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "referrals" ADD CONSTRAINT "referrals_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "referrals" ADD CONSTRAINT "referrals_source_document_id_medical_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."medical_documents"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rights_requests" ADD CONSTRAINT "rights_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rights_requests" ADD CONSTRAINT "rights_requests_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sprint_activities" ADD CONSTRAINT "sprint_activities_sprint_id_sprints_id_fk" FOREIGN KEY ("sprint_id") REFERENCES "public"."sprints"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sprint_activities" ADD CONSTRAINT "sprint_activities_admin_user_id_admin_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sprint_tasks" ADD CONSTRAINT "sprint_tasks_sprint_id_sprints_id_fk" FOREIGN KEY ("sprint_id") REFERENCES "public"."sprints"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sprint_tasks" ADD CONSTRAINT "sprint_tasks_task_id_dev_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."dev_tasks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sprints" ADD CONSTRAINT "sprints_phase_id_dev_phases_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."dev_phases"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sprints" ADD CONSTRAINT "sprints_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sync_events" ADD CONSTRAINT "sync_events_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sync_events" ADD CONSTRAINT "sync_events_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "task_calendar_sync" ADD CONSTRAINT "task_calendar_sync_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "task_calendar_sync" ADD CONSTRAINT "task_calendar_sync_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "task_checklists" ADD CONSTRAINT "task_checklists_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_google_calendar_tokens" ADD CONSTRAINT "user_google_calendar_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vitals" ADD CONSTRAINT "vitals_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vitals" ADD CONSTRAINT "vitals_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vitals" ADD CONSTRAINT "vitals_source_document_id_medical_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."medical_documents"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vitals" ADD CONSTRAINT "vitals_recorded_by_user_id_users_id_fk" FOREIGN KEY ("recorded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_allergies_patient_allergen" ON "patient_allergies" ("patient_id","allergen");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_primary_family_id_families_id_fk" FOREIGN KEY ("primary_family_id") REFERENCES "public"."families"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
