CREATE TABLE "import_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"column_mapping" jsonb NOT NULL,
	"date_format" text NOT NULL,
	"amount_format" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "import_templates_user_name_unique" UNIQUE("user_id","name")
);
--> statement-breakpoint
CREATE INDEX "import_templates_user_id_idx" ON "import_templates" USING btree ("user_id");