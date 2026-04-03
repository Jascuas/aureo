# Sprint 07: Database Triggers - Critical Bug Fix

> **Status**: 🔥 **CRITICAL BUG FOUND**  
> **Type**: Bug Fix + Data Integrity  
> **Priority**: P0 - CRITICAL  
> **Estimated Effort**: 2-3 days

---

## 🚨 CRITICAL ISSUE DISCOVERED

**A balance trigger already exists but has a CRITICAL BUG that corrupts account balances.**

### The Bug

**Current trigger** (deployed in production):

```sql
-- ❌ BUGGY CODE
IF (TG_OP = 'INSERT') THEN
  UPDATE accounts
  SET balance = balance + NEW.amount  -- ALWAYS ADDS (ignores transaction type!)
  WHERE id = NEW.account_id;
```

**Problem**: The trigger ignores `transaction_type_id` and always **adds** the amount.

**Impact**:

- ✅ Income transactions: Work correctly (accidentally)
- ❌ **Expense transactions: Double-counted in WRONG direction**
- ✅ Refund transactions: Work correctly (accidentally)

**Example corruption**:

```
Starting balance: $1,000.00
User creates expense: -$50.00

Expected: $950.00
Actual: $1,050.00  ❌ (+$100 error per expense!)
```

### Data Corruption Formula

Every expense transaction creates:

```
Expected: balance - amount
Actual:   balance + amount
Net Error: +2 × amount
```

---

## 🎯 Goal

**Fix the trigger bug immediately** and recalculate all corrupted balances to restore data integrity.

---

## ✅ Quick Start Checklist

**Estimación total**: 2-3 días

- [ ] **Task 1**: Diagnosticar corrupción de datos (SQL query) — 2 horas
- [ ] **Task 2**: Crear migración con recalcular + fix trigger — 4 horas
- [ ] **Task 3**: Verificar código de API (✅ YA HECHO) — 0 horas
- [ ] **Task 4**: Probar trigger corregido (INSERT/UPDATE/DELETE) — 3 horas
- [ ] **Task 5**: Crear endpoint admin de verificación — 2 horas
- [ ] **Task 6**: Documentar en architecture.md — 1 hora

**Total estimado**: ~12 horas (1.5 días)  
**Buffer para testing**: +1 día  
**Total con buffer**: 2-3 días

---

## 📋 Detailed Tasks

### 🔥 Task 1: Diagnosticar Corrupción de Datos

**File**: Create `scripts/diagnose-balance-corruption.mjs` (new)

**Estimación**: 2 horas

- [ ] Create diagnostic script to identify corrupted accounts
- [ ] Run query to compare current vs. correct balances
- [ ] Generate report of affected accounts
- [ ] Calculate total corruption amount

**Diagnostic Query**:

```sql
SELECT
  a.id,
  a.name,
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
GROUP BY a.id, a.name, a.balance
HAVING a.balance <> COALESCE(SUM(
  CASE
    WHEN tt.name = 'income' THEN t.amount
    WHEN tt.name = 'expense' THEN -t.amount
    WHEN tt.name = 'refund' THEN t.amount
    ELSE 0
  END
), 0);
```

---

### 🔥 Task 2: Crear Migración con Recalcular + Fix Trigger

**File**: `drizzle/XXXX_fix_balance_trigger.sql` (new)

**Estimación**: 4 horas

- [ ] Drop existing buggy trigger and function
- [ ] Recalculate all account balances (data fix)
- [ ] Create corrected trigger that respects transaction types
- [ ] Test INSERT, UPDATE, DELETE operations

**Migration SQL**:

```sql
-- Step 1: Drop buggy trigger
DROP TRIGGER IF EXISTS transactions_balance_trigger ON transactions;
DROP FUNCTION IF EXISTS update_account_balance();

-- Step 2: Recalculate all balances (FIX CORRUPTED DATA)
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
WHERE accounts.id = subquery.id;

-- Step 3: Create CORRECTED trigger function
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
DECLARE
  balance_delta INTEGER;
  old_balance_delta INTEGER;
BEGIN

  IF (TG_OP = 'INSERT') THEN
    -- Calculate balance change based on transaction type
    SELECT
      CASE
        WHEN tt.name IN ('income', 'refund') THEN NEW.amount
        WHEN tt.name = 'expense' THEN -NEW.amount
        ELSE 0
      END INTO balance_delta
    FROM transaction_types tt
    WHERE tt.id = NEW.transaction_type_id;

    -- Apply balance change
    UPDATE accounts
    SET balance = COALESCE(balance, 0) + balance_delta
    WHERE id = NEW.account_id;

    RETURN NEW;

  ELSIF (TG_OP = 'DELETE') THEN
    -- Revert balance change
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
    -- Revert old transaction
    SELECT
      CASE
        WHEN tt.name IN ('income', 'refund') THEN -OLD.amount
        WHEN tt.name = 'expense' THEN OLD.amount
        ELSE 0
      END INTO old_balance_delta
    FROM transaction_types tt
    WHERE tt.id = OLD.transaction_type_id;

    -- Calculate new transaction
    SELECT
      CASE
        WHEN tt.name IN ('income', 'refund') THEN NEW.amount
        WHEN tt.name = 'expense' THEN -NEW.amount
        ELSE 0
      END INTO balance_delta
    FROM transaction_types tt
    WHERE tt.id = NEW.transaction_type_id;

    -- Handle account changes
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
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger
CREATE TRIGGER transactions_balance_trigger
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_account_balance();
```

---

### ✅ Task 3: Verificar Código de API (YA HECHO)

**Files Checked**: `app/api/[[...route]]/transactions.ts`

**Estimación**: 0 horas (completado durante análisis)

- [x] ✅ Confirmed: API does NOT manually update balances
- [x] ✅ All endpoints rely on trigger (correct architecture)
- [ ] No changes needed to API code

**Analysis Result**:

```typescript
// POST /transactions (line 149-158)
const [data] = await db.insert(transactions).values({...}).returning();
// ✅ No manual balance update

// PATCH /transactions/:id (line 255-265)
const [data] = await db.update(transactions).set(values).returning();
// ✅ No manual balance update

// DELETE /transactions/:id (line 297-308)
const [data] = await db.delete(transactions).returning();
// ✅ No manual balance update
```

---

### 🧪 Task 4: Probar Trigger Corregido (INSERT/UPDATE/DELETE)

**File**: Create `scripts/test-trigger-fix.mjs` (new)

**Estimación**: 3 horas

- [ ] Test basic INSERT operations (income, expense, refund)
- [ ] Test UPDATE operations (amount change, type change, account change)
- [ ] Test DELETE operations
- [ ] Test concurrent transactions (race conditions)
- [ ] Verify balances match expected calculations

**Test Scenarios**:

```typescript
// Test 1: Basic operations
// - Insert income $100 → balance = $100
// - Insert expense $50 → balance = $50
// - Insert refund $10 → balance = $60

// Test 2: UPDATE operations
// - Change expense $50 → $75 → balance = $35
// - Change type expense → income → balance = $185

// Test 3: DELETE operations
// - Delete income $100 → balance = $85

// Test 4: Account transfer
// - Move transaction to different account
// - Verify both accounts have correct balances

// Test 5: Concurrency
// - Insert 100 transactions simultaneously
// - Verify final balance = initial + sum(all transactions)
```

---

### 🛠️ Task 5: Crear Endpoint Admin de Verificación

**File**: `app/api/[[...route]]/admin.ts` (new)

**Estimación**: 2 horas

- [ ] Create `GET /api/admin/verify-balances` endpoint
- [ ] Return list of accounts with balance mismatches
- [ ] Add `POST /api/admin/recalculate-balances` endpoint (manual fix)
- [ ] Require admin authentication

**Implementation**:

```typescript
import { Hono } from "hono";
import { db } from "@/db/drizzle";
import { sql } from "drizzle-orm";

const app = new Hono().get("/verify-balances", async (c) => {
  const results = await db.execute(sql`
      SELECT 
        a.id,
        a.name,
        a.balance AS current_balance,
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
      GROUP BY a.id, a.name, a.balance
      HAVING a.balance <> COALESCE(SUM(...), 0)
    `);

  return c.json({
    corruptedAccounts: results.rows,
    count: results.rows.length,
  });
});

export default app;
```

---

### 📚 Task 6: Documentar en architecture.md

**File**: `.opencode/docs/architecture.md`

**Estimación**: 1 hora

- [ ] Add "Balance Management" section
- [ ] Document trigger behavior and transaction type logic
- [ ] Add critical warning about never manually updating balances
- [ ] Document verification endpoint

**Content to Add**:

```markdown
## Balance Management

### Critical Rules

1. **NEVER manually UPDATE accounts.balance** in application code
2. Balances are maintained by PostgreSQL trigger `update_account_balance()`
3. Trigger respects transaction types:
   - `income`: adds to balance (+)
   - `expense`: subtracts from balance (-)
   - `refund`: adds to balance (+)

### Trigger Behavior

- Executes AFTER INSERT/UPDATE/DELETE on transactions table
- Uses JOIN with transaction_types to determine correct operation
- Automatically handles account transfers (UPDATE account_id)
- Atomic with transaction (rollback reverts balance changes)
- Prevents race conditions via PostgreSQL row locking

### Data Integrity

- Run `GET /api/admin/verify-balances` to check for mismatches
- Trigger was fixed in migration `XXXX_fix_balance_trigger.sql` (April 2026)
- Previous bug caused expense double-counting (now resolved)

### Migration History

- **Before fix**: Trigger always added amount (ignored transaction type)
- **After fix**: Trigger correctly applies +/- based on transaction type
- All balances recalculated during migration deployment
```

---

## ✅ Acceptance Criteria

- [ ] Diagnostic script identifies all corrupted accounts
- [ ] Migration successfully recalculates all balances
- [ ] Fixed trigger deployed and tested
- [ ] All test scenarios pass (basic, UPDATE, DELETE, concurrent)
- [ ] Admin verification endpoint created
- [ ] Documentation updated with trigger details
- [ ] Zero balance mismatches after migration

---

## 🎯 Expected Outcome

**Before (BUGGY)**:

- ❌ Expenses incorrectly increase balance
- ❌ All accounts with expenses have inflated balances
- ❌ Data integrity compromised

**After (FIXED)**:

- ✅ Income adds to balance
- ✅ Expenses subtract from balance
- ✅ Refunds add to balance
- ✅ All balances match transaction history
- ✅ Data integrity restored

---

## 📊 Bug Impact Summary

| Issue                                | Status      | Action                   |
| ------------------------------------ | ----------- | ------------------------ |
| Trigger ignores transaction type     | 🔥 Critical | Fix trigger function     |
| Expense transactions corrupt balance | 🔥 Critical | Recalculate all balances |
| No balance verification tool         | ⚠️ Medium   | Create admin endpoint    |
| Documentation missing                | ⚠️ Low      | Update architecture docs |

---

## ⚠️ Edge Cases Handled

1. ✅ **Account ID changes (UPDATE)**: Correctly moves balance between accounts
2. ✅ **Transaction type changes (UPDATE)**: Reverts old type, applies new type
3. ✅ **NULL balances**: Uses `COALESCE(balance, 0)`
4. ✅ **Amount changes (UPDATE)**: Full revert + reapply
5. ✅ **Unknown transaction types**: Returns 0 delta (defensive)
6. ✅ **Concurrent transactions**: PostgreSQL row-level locking prevents races

---

## 🧪 Testing Strategy

**Pre-deployment** (Staging):

1. Run diagnostic query to assess corruption
2. Count affected accounts and total error amount
3. Apply migration (recalculation + fix)
4. Run all test scenarios
5. Verify zero mismatches via admin endpoint

**Post-deployment** (Production):

1. Monitor for 24 hours
2. Run verification endpoint daily for 1 week
3. Check error logs for trigger failures

---

## 📝 Notes

- This is a **CRITICAL BUG FIX**, not a feature sprint
- Deploy to production ASAP after testing in staging
- The bug has been present since trigger creation (unknown date)
- All expense transactions since trigger deployment are affected
- API code is already correct (no changes needed)

---

## 🔗 Related

- **Backlog**: Database Triggers for Balance (moved to this sprint)
- **Tech Debt**: Critical data integrity issue
- **Priority**: P0 - CRITICAL (blocks all other work)
- **Root Cause**: Missing JOIN with transaction_types table
- **Fix**: Add transaction type logic to trigger function
