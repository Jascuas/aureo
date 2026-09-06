ALTER TABLE "transactions" ADD COLUMN "import_key" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_import_key_unique" UNIQUE("account_id","import_key");