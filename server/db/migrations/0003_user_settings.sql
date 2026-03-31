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
DO $$ BEGIN
 ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
