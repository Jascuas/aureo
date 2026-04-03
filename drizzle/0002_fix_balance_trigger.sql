-- Migration: Fix Balance Trigger Bug
-- Date: 2026-04-03
-- Description: Fix critical bug in update_account_balance() trigger that ignores
--              transaction_type_id and always adds amounts, causing balance corruption
--              for expense transactions.
--
-- Bug Impact: All expense transactions incorrectly increase balance instead of decrease
-- Error Formula: Each expense creates +2× amount corruption
-- Affected: 5/6 accounts (83.3%), €38,754.84 total corruption
--
-- This migration:
-- 1. Drops buggy trigger and function
-- 2. Recalculates all account balances from transaction history
-- 3. Creates corrected trigger that respects transaction types

-- ============================================================================
-- STEP 1: Drop Buggy Trigger and Function
-- ============================================================================

DROP TRIGGER IF EXISTS transactions_balance_trigger ON transactions;
DROP FUNCTION IF EXISTS update_account_balance();

-- ============================================================================
-- STEP 2: Recalculate All Account Balances (FIX CORRUPTED DATA)
-- ============================================================================

UPDATE accounts
SET balance = subquery.correct_balance
FROM (
  SELECT 
    a.id,
    COALESCE(SUM(
      CASE 
        WHEN LOWER(tt.name) IN ('income', 'refund') THEN t.amount
        WHEN LOWER(tt.name) = 'expense' THEN -t.amount
        ELSE 0
      END
    ), 0) AS correct_balance
  FROM accounts a
  LEFT JOIN transactions t ON t.account_id = a.id
  LEFT JOIN transaction_types tt ON t.transaction_type_id = tt.id
  GROUP BY a.id
) AS subquery
WHERE accounts.id = subquery.id;

-- ============================================================================
-- STEP 3: Create Corrected Trigger Function
-- ============================================================================

CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
DECLARE
  balance_delta INTEGER;
  old_balance_delta INTEGER;
BEGIN
  
  -- ========================================================================
  -- INSERT: Add new transaction to balance
  -- ========================================================================
  IF (TG_OP = 'INSERT') THEN
    -- Calculate balance change based on transaction type (case-insensitive)
    SELECT 
      CASE 
        WHEN LOWER(tt.name) IN ('income', 'refund') THEN NEW.amount
        WHEN LOWER(tt.name) = 'expense' THEN -NEW.amount
        ELSE 0  -- Unknown types don't affect balance (defensive)
      END INTO balance_delta
    FROM transaction_types tt
    WHERE tt.id = NEW.transaction_type_id;
    
    -- Apply balance change
    UPDATE accounts
    SET balance = COALESCE(balance, 0) + balance_delta
    WHERE id = NEW.account_id;
    
    RETURN NEW;

  -- ========================================================================
  -- DELETE: Revert transaction from balance
  -- ========================================================================
  ELSIF (TG_OP = 'DELETE') THEN
    -- Calculate reversal (opposite of INSERT, case-insensitive)
    SELECT 
      CASE 
        WHEN LOWER(tt.name) IN ('income', 'refund') THEN -OLD.amount
        WHEN LOWER(tt.name) = 'expense' THEN OLD.amount
        ELSE 0
      END INTO balance_delta
    FROM transaction_types tt
    WHERE tt.id = OLD.transaction_type_id;
    
    -- Apply reversal
    UPDATE accounts
    SET balance = COALESCE(balance, 0) + balance_delta
    WHERE id = OLD.account_id;
    
    RETURN OLD;

  -- ========================================================================
  -- UPDATE: Revert old transaction and apply new one
  -- ========================================================================
  ELSIF (TG_OP = 'UPDATE') THEN
    -- Calculate old transaction reversal (case-insensitive)
    SELECT 
      CASE 
        WHEN LOWER(tt.name) IN ('income', 'refund') THEN -OLD.amount
        WHEN LOWER(tt.name) = 'expense' THEN OLD.amount
        ELSE 0
      END INTO old_balance_delta
    FROM transaction_types tt
    WHERE tt.id = OLD.transaction_type_id;
    
    -- Calculate new transaction effect (case-insensitive)
    SELECT 
      CASE 
        WHEN LOWER(tt.name) IN ('income', 'refund') THEN NEW.amount
        WHEN LOWER(tt.name) = 'expense' THEN -NEW.amount
        ELSE 0
      END INTO balance_delta
    FROM transaction_types tt
    WHERE tt.id = NEW.transaction_type_id;
    
    -- Handle account_id changes (transaction moved between accounts)
    IF (NEW.account_id <> OLD.account_id) THEN
      -- Revert from old account
      UPDATE accounts
      SET balance = COALESCE(balance, 0) + old_balance_delta
      WHERE id = OLD.account_id;
      
      -- Apply to new account
      UPDATE accounts
      SET balance = COALESCE(balance, 0) + balance_delta
      WHERE id = NEW.account_id;
    ELSE
      -- Same account: apply net change
      UPDATE accounts
      SET balance = COALESCE(balance, 0) + old_balance_delta + balance_delta
      WHERE id = NEW.account_id;
    END IF;
    
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 4: Create Trigger
-- ============================================================================

CREATE TRIGGER transactions_balance_trigger
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_account_balance();

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- 
-- Verification:
-- 1. All account balances have been recalculated from transaction history
-- 2. Trigger now correctly handles:
--    - income: adds to balance (+)
--    - expense: subtracts from balance (-)
--    - refund: adds to balance (+)
-- 3. Trigger handles edge cases:
--    - Account transfers (UPDATE account_id)
--    - Transaction type changes (UPDATE transaction_type_id)
--    - NULL balances (COALESCE)
--    - Concurrent transactions (PostgreSQL row locking)
-- 
-- Next Steps:
-- 1. Verify: Run scripts/diagnose-balance-corruption.mjs (should show 0 corrupted)
-- 2. Monitor: GET /api/admin/verify-balances (after implementing endpoint)
-- 3. Test: Create test transactions and verify balances update correctly
