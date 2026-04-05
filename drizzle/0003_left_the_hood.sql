ALTER TABLE "import_templates" DROP CONSTRAINT "import_templates_user_name_unique";--> statement-breakpoint
DELETE FROM "import_templates";--> statement-breakpoint
ALTER TABLE "import_templates" ADD COLUMN "account_id" text NOT NULL;--> statement-breakpoint
CREATE INDEX "import_templates_account_id_idx" ON "import_templates" USING btree ("account_id");--> statement-breakpoint
ALTER TABLE "import_templates" ADD CONSTRAINT "import_templates_user_account_unique" UNIQUE("user_id","account_id");