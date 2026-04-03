-- Migration: Fix Trigger Case Sensitivity Bug
-- Date: 2026-04-03
-- Description: Fix trigger function that compares transaction type names with wrong case.
--              Transaction types are stored as "Income", "Expense", "Refund" (capitalized)
--              but trigger was comparing against lowercase 'income', 'expense', 'refund'.
--
-- Bug Impact: Trigger always returns 0 balance delta, so balances never update
-- Root Cause: Case-sensitive string comparison in CASE statements
--
-- This migration:
-- 1. Drops existing trigger function
-- 2. Recreates with corrected case-insensitive comparisons

-- ============================================================================
-- STEP 1: Drop Existing Trigger and Function
-- ============================================================================

DROP TRIGGER IF EXISTS transactions_balance_trigger ON transactions;
DROP FUNCTION IF EXISTS update_account_balance();

-- ============================================================================
-- STEP 2: Create Corrected Trigger Function (Case-Insensitive)
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
    -- Calculate reversal (opposite of INSERT)
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
    -- Calculate old transaction reversal
    SELECT 
      CASE 
        WHEN LOWER(tt.name) IN ('income', 'refund') THEN -OLD.amount
        WHEN LOWER(tt.name) = 'expense' THEN OLD.amount
        ELSE 0
      END INTO old_balance_delta
    FROM transaction_types tt
    WHERE tt.id = OLD.transaction_type_id;
    
    -- Calculate new transaction effect
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
-- STEP 3: Recreate Trigger
-- ============================================================================

CREATE TRIGGER transactions_balance_trigger
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_account_balance();

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- 
-- Fix Applied: All CASE statements now use LOWER(tt.name) for case-insensitive comparison
-- Expected: Trigger should now correctly update account balances on transaction changes
