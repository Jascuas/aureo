CREATE TABLE IF NOT EXISTS "transaction_types" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "transaction_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
INSERT INTO "transaction_types" ("id", "name") VALUES 
  ('income', 'Income'),
  ('expense', 'Expense'),
  ('refund', 'Refund')
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "balance" integer;--> statement-breakpoint
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'transaction_type_id'
  ) THEN
    ALTER TABLE "transactions" ADD COLUMN "transaction_type_id" text;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'transactions_transaction_type_id_transaction_types_id_fk'
  ) THEN
    ALTER TABLE "transactions" ADD CONSTRAINT "transactions_transaction_type_id_transaction_types_id_fk" 
    FOREIGN KEY ("transaction_type_id") REFERENCES "public"."transaction_types"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;