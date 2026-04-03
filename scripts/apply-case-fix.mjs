#!/usr/bin/env node

import { neon } from "@neondatabase/serverless";
import "dotenv/config";

const sql = neon(process.env.DATABASE_URL);

async function applyFixDirectly() {
  console.log("🔧 Applying case-sensitivity fix...\n");

  // Drop existing trigger and function
  await sql`DROP TRIGGER IF EXISTS transactions_balance_trigger ON transactions`;
  await sql`DROP FUNCTION IF EXISTS update_account_balance()`;
  console.log("✅ Dropped old trigger and function\n");

  // Create corrected function with LOWER()
  await sql`
    CREATE OR REPLACE FUNCTION update_account_balance()
    RETURNS TRIGGER AS $$
    DECLARE
      balance_delta INTEGER;
      old_balance_delta INTEGER;
    BEGIN
      
      IF (TG_OP = 'INSERT') THEN
        SELECT 
          CASE 
            WHEN LOWER(tt.name) IN ('income', 'refund') THEN NEW.amount
            WHEN LOWER(tt.name) = 'expense' THEN -NEW.amount
            ELSE 0
          END INTO balance_delta
        FROM transaction_types tt
        WHERE tt.id = NEW.transaction_type_id;
        
        UPDATE accounts
        SET balance = COALESCE(balance, 0) + balance_delta
        WHERE id = NEW.account_id;
        
        RETURN NEW;

      ELSIF (TG_OP = 'DELETE') THEN
        SELECT 
          CASE 
            WHEN LOWER(tt.name) IN ('income', 'refund') THEN -OLD.amount
            WHEN LOWER(tt.name) = 'expense' THEN OLD.amount
            ELSE 0
          END INTO balance_delta
        FROM transaction_types tt
        WHERE tt.id = OLD.transaction_type_id;
        
        UPDATE accounts
        SET balance = COALESCE(balance, 0) + balance_delta
        WHERE id = OLD.account_id;
        
        RETURN OLD;

      ELSIF (TG_OP = 'UPDATE') THEN
        SELECT 
          CASE 
            WHEN LOWER(tt.name) IN ('income', 'refund') THEN -OLD.amount
            WHEN LOWER(tt.name) = 'expense' THEN OLD.amount
            ELSE 0
          END INTO old_balance_delta
        FROM transaction_types tt
        WHERE tt.id = OLD.transaction_type_id;
        
        SELECT 
          CASE 
            WHEN LOWER(tt.name) IN ('income', 'refund') THEN NEW.amount
            WHEN LOWER(tt.name) = 'expense' THEN -NEW.amount
            ELSE 0
          END INTO balance_delta
        FROM transaction_types tt
        WHERE tt.id = NEW.transaction_type_id;
        
        IF (NEW.account_id <> OLD.account_id) THEN
          UPDATE accounts
          SET balance = COALESCE(balance, 0) + old_balance_delta
          WHERE id = OLD.account_id;
          
          UPDATE accounts
          SET balance = COALESCE(balance, 0) + balance_delta
          WHERE id = NEW.account_id;
        ELSE
          UPDATE accounts
          SET balance = COALESCE(balance, 0) + old_balance_delta + balance_delta
          WHERE id = NEW.account_id;
        END IF;
        
        RETURN NEW;
      END IF;

      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql
  `;
  console.log("✅ Created corrected function with LOWER()\n");

  // Recreate trigger
  await sql`
    CREATE TRIGGER transactions_balance_trigger
    AFTER INSERT OR UPDATE OR DELETE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_account_balance()
  `;
  console.log("✅ Created trigger\n");

  console.log("═══════════════════════════════════════════════════════");
  console.log("✅ FIX APPLIED SUCCESSFULLY");
  console.log("═══════════════════════════════════════════════════════\n");

  process.exit(0);
}

applyFixDirectly().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
