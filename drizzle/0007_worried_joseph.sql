CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "transactions_account_date_id_idx" ON "transactions" USING btree ("account_id","date","id");--> statement-breakpoint
CREATE INDEX "transactions_account_transaction_type_date_idx" ON "transactions" USING btree ("account_id","transaction_type_id","date");