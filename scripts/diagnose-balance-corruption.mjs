#!/usr/bin/env node

/**
 * Diagnostic Script: Balance Corruption Detection
 *
 * Purpose: Identify accounts with corrupted balances due to the buggy trigger
 * that ignores transaction_type_id and always adds amounts.
 *
 * Bug: Trigger always does `balance + amount` instead of:
 *   - income: balance + amount ✅
 *   - expense: balance - amount ❌ (currently doing + amount)
 *   - refund: balance + amount ✅
 *
 * Formula: Each expense creates +2× amount error
 */

import { neon } from "@neondatabase/serverless";
import "dotenv/config";

const sql = neon(process.env.DATABASE_URL);

console.log("🔍 Starting Balance Corruption Diagnostic...\n");

// Query to find corrupted accounts
const corruptedAccounts = await sql`
  SELECT 
    a.id,
    a.name,
    a.user_id,
    a.balance AS current_balance,
    COALESCE(SUM(
      CASE 
        WHEN tt.name = 'income' THEN t.amount
        WHEN tt.name = 'expense' THEN -t.amount
        WHEN tt.name = 'refund' THEN t.amount
        ELSE 0
      END
    ), 0) AS correct_balance,
    a.balance - COALESCE(SUM(
      CASE 
        WHEN tt.name = 'income' THEN t.amount
        WHEN tt.name = 'expense' THEN -t.amount
        WHEN tt.name = 'refund' THEN t.amount
        ELSE 0
      END
    ), 0) AS corruption_amount
  FROM accounts a
  LEFT JOIN transactions t ON t.account_id = a.id
  LEFT JOIN transaction_types tt ON t.transaction_type_id = tt.id
  WHERE a.balance IS NOT NULL
  GROUP BY a.id, a.name, a.user_id, a.balance
  HAVING a.balance <> COALESCE(SUM(
    CASE 
      WHEN tt.name = 'income' THEN t.amount
      WHEN tt.name = 'expense' THEN -t.amount
      WHEN tt.name = 'refund' THEN t.amount
      ELSE 0
    END
  ), 0)
  ORDER BY ABS(a.balance - COALESCE(SUM(
    CASE 
      WHEN tt.name = 'income' THEN t.amount
      WHEN tt.name = 'expense' THEN -t.amount
      WHEN tt.name = 'refund' THEN t.amount
      ELSE 0
    END
  ), 0)) DESC;
`;

// Get total accounts count
const [totalAccountsResult] = await sql`
  SELECT COUNT(*) as total FROM accounts WHERE balance IS NOT NULL;
`;
const totalAccounts = parseInt(totalAccountsResult.total);

// Calculate statistics
const corruptedCount = corruptedAccounts.length;
const totalCorruptionAmount = corruptedAccounts.reduce(
  (sum, acc) => sum + parseInt(acc.corruption_amount),
  0,
);

// Convert milliunits to currency
const formatAmount = (milliunits) => {
  const amount = milliunits / 1000;
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
};

// Print results
console.log("═══════════════════════════════════════════════════════");
console.log("📊 DIAGNOSTIC RESULTS");
console.log("═══════════════════════════════════════════════════════\n");

console.log(`Total Accounts: ${totalAccounts}`);
console.log(
  `Corrupted Accounts: ${corruptedCount} (${((corruptedCount / totalAccounts) * 100).toFixed(1)}%)`,
);
console.log(`Total Corruption: ${formatAmount(totalCorruptionAmount)}`);

if (corruptedCount === 0) {
  console.log("\n✅ NO CORRUPTION FOUND - All balances are correct!\n");
  process.exit(0);
}

console.log("\n⚠️  CORRUPTED ACCOUNTS DETECTED\n");
console.log("═══════════════════════════════════════════════════════\n");

// Print detailed results
corruptedAccounts.forEach((account, index) => {
  console.log(`${index + 1}. Account: ${account.name} (${account.id})`);
  console.log(`   User ID: ${account.user_id}`);
  console.log(`   Current Balance: ${formatAmount(account.current_balance)}`);
  console.log(`   Correct Balance: ${formatAmount(account.correct_balance)}`);
  console.log(
    `   Corruption: ${formatAmount(account.corruption_amount)} (${account.corruption_amount > 0 ? "+" : ""}${formatAmount(account.corruption_amount)})`,
  );
  console.log("");
});

console.log("═══════════════════════════════════════════════════════");
console.log("🔧 RECOMMENDED ACTION");
console.log("═══════════════════════════════════════════════════════\n");

console.log("1. Run migration to fix trigger and recalculate balances");
console.log("2. File: drizzle/XXXX_fix_balance_trigger.sql");
console.log("3. Verify fix with: GET /api/admin/verify-balances\n");

console.log("═══════════════════════════════════════════════════════\n");

process.exit(0);
