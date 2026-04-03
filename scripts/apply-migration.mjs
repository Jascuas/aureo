#!/usr/bin/env node

import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import "dotenv/config";

const sql = neon(process.env.DATABASE_URL);

console.log("🔧 Applying migration: 0002_fix_balance_trigger.sql\n");

try {
  // Step 1: Drop buggy trigger and function
  console.log("Step 1: Dropping buggy trigger and function...");
  await sql`DROP TRIGGER IF EXISTS transactions_balance_trigger ON transactions`;
  await sql`DROP FUNCTION IF EXISTS update_account_balance()`;
  console.log("✅ Dropped\n");

  // Step 2: Recalculate all balances
  console.log("Step 2: Recalculating all account balances...");
  await sql`
    UPDATE accounts
    SET balance = subquery.correct_balance
    FROM (
      SELECT 
        a.id,
        COALESCE(SUM(
          CASE 
            WHEN tt.name IN ('income', 'refund') THEN t.amount
            WHEN tt.name = 'expense' THEN -t.amount
            ELSE 0
          END
        ), 0) AS correct_balance
      FROM accounts a
      LEFT JOIN transactions t ON t.account_id = a.id
      LEFT JOIN transaction_types tt ON t.transaction_type_id = tt.id
      GROUP BY a.id
    ) AS subquery
    WHERE accounts.id = subquery.id
  `;
  console.log("✅ Recalculated\n");

  // Step 3: Create corrected trigger function
  console.log("Step 3: Creating corrected trigger function...");
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
            WHEN tt.name IN ('income', 'refund') THEN NEW.amount
            WHEN tt.name = 'expense' THEN -NEW.amount
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
            WHEN tt.name IN ('income', 'refund') THEN -OLD.amount
            WHEN tt.name = 'expense' THEN OLD.amount
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
            WHEN tt.name IN ('income', 'refund') THEN -OLD.amount
            WHEN tt.name = 'expense' THEN OLD.amount
            ELSE 0
          END INTO old_balance_delta
        FROM transaction_types tt
        WHERE tt.id = OLD.transaction_type_id;
        
        SELECT 
          CASE 
            WHEN tt.name IN ('income', 'refund') THEN NEW.amount
            WHEN tt.name = 'expense' THEN -NEW.amount
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
  console.log("✅ Function created\n");

  // Step 4: Create trigger
  console.log("Step 4: Creating trigger...");
  await sql`
    CREATE TRIGGER transactions_balance_trigger
    AFTER INSERT OR UPDATE OR DELETE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_account_balance()
  `;
  console.log("✅ Trigger created\n");

  console.log("═══════════════════════════════════════════════════════");
  console.log("✅ MIGRATION COMPLETED SUCCESSFULLY");
  console.log("═══════════════════════════════════════════════════════\n");
  console.log("Changes made:");
  console.log("  1. ✅ Dropped buggy trigger and function");
  console.log("  2. ✅ Recalculated all account balances");
  console.log("  3. ✅ Created corrected trigger function");
  console.log("  4. ✅ Created new trigger");
  console.log("\n📋 Next Steps:");
  console.log("  - Run: node scripts/diagnose-balance-corruption.mjs");
  console.log("  - Expected: 0 corrupted accounts\n");

  process.exit(0);
} catch (error) {
  console.error("\n❌ Migration failed:", error.message);
  console.error("\nFull error:", error);
  process.exit(1);
}
