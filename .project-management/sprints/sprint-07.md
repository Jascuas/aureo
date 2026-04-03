# Sprint 07: Database Triggers & Balance Automation

> **Status**: 🚀 READY TO START  
> **Type**: Refactoring + Performance  
> **Priority**: HIGH  
> **Estimated Effort**: 1 week

---

## 🎯 Goal

Implement PostgreSQL triggers to auto-update account balances, eliminating manual balance calculation logic in the API. This improves data consistency, prevents race conditions, and simplifies transaction management.

---

## 📋 Tasks

### 1. Create Database Trigger for INSERT

**File**: `db/migrations/XXXX_balance_triggers.sql` (new)

- [ ] Create trigger function `update_account_balance_on_insert()`
- [ ] Trigger increments/decrements balance based on transaction type and amount
- [ ] Handle both income and expense transactions correctly
- [ ] Test with positive and negative amounts (edge case: negative income, negative expense)

**Implementation**:

```sql
CREATE OR REPLACE FUNCTION update_account_balance_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'income' THEN
    UPDATE accounts 
    SET balance = balance + NEW.amount 
    WHERE id = NEW.account_id;
  ELSE
    UPDATE accounts 
    SET balance = balance - NEW.amount 
    WHERE id = NEW.account_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transaction_insert_balance_trigger
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_account_balance_on_insert();
```

---

### 2. Create Database Trigger for UPDATE

**File**: Same migration file

- [ ] Create trigger function `update_account_balance_on_update()`
- [ ] Revert old balance change (using OLD.amount and OLD.type)
- [ ] Apply new balance change (using NEW.amount and NEW.type)
- [ ] Handle account_id changes (rare but possible)

**Implementation**:

```sql
CREATE OR REPLACE FUNCTION update_account_balance_on_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Revert old transaction
  IF OLD.type = 'income' THEN
    UPDATE accounts 
    SET balance = balance - OLD.amount 
    WHERE id = OLD.account_id;
  ELSE
    UPDATE accounts 
    SET balance = balance + OLD.amount 
    WHERE id = OLD.account_id;
  END IF;

  -- Apply new transaction
  IF NEW.type = 'income' THEN
    UPDATE accounts 
    SET balance = balance + NEW.amount 
    WHERE id = NEW.account_id;
  ELSE
    UPDATE accounts 
    SET balance = balance - NEW.amount 
    WHERE id = NEW.account_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transaction_update_balance_trigger
AFTER UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_account_balance_on_update();
```

---

### 3. Create Database Trigger for DELETE

**File**: Same migration file

- [ ] Create trigger function `update_account_balance_on_delete()`
- [ ] Revert balance change (opposite of INSERT logic)

**Implementation**:

```sql
CREATE OR REPLACE FUNCTION update_account_balance_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.type = 'income' THEN
    UPDATE accounts 
    SET balance = balance - OLD.amount 
    WHERE id = OLD.account_id;
  ELSE
    UPDATE accounts 
    SET balance = balance + OLD.amount 
    WHERE id = OLD.account_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transaction_delete_balance_trigger
AFTER DELETE ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_account_balance_on_delete();
```

---

### 4. Remove Manual Balance Logic from API

**Files to Update**:

- [ ] `app/api/[[...route]]/transactions.ts` (create/update/delete endpoints)
- [ ] `app/api/[[...route]]/accounts.ts` (if any manual recalculation exists)

**Changes**:

- Remove all `UPDATE accounts SET balance = ...` queries from transaction API
- Remove balance calculation helpers (if any)
- Simplify transaction mutation logic (triggers handle balance now)

**Before (manual)**:

```typescript
// Create transaction
await db.insert(transactions).values(data);

// Manually update balance
await db
  .update(accounts)
  .set({
    balance: sql`balance ${data.type === "income" ? "+" : "-"} ${data.amount}`,
  })
  .where(eq(accounts.id, data.accountId));
```

**After (automatic via trigger)**:

```typescript
// Create transaction (balance updated automatically by DB trigger)
await db.insert(transactions).values(data);
```

---

### 5. Test Race Condition Scenarios

**Test Cases**:

- [ ] Concurrent inserts on same account (simulate with Promise.all)
- [ ] Rapid update/delete sequence
- [ ] Transaction rollback scenario (ensure trigger respects rollback)
- [ ] Verify final balance matches sum of all transactions

**Test Script** (optional):

```typescript
// Create 100 transactions concurrently for same account
const promises = Array(100)
  .fill(null)
  .map(() =>
    fetch("/api/transactions", {
      method: "POST",
      body: JSON.stringify({
        accountId: "test-account",
        amount: 1000, // 10.00 EUR
        type: "income",
        // ...
      }),
    })
  );

await Promise.all(promises);

// Verify balance = initial + (100 * 10.00)
```

---

### 6. Document Trigger Behavior

**File**: `.opencode/docs/database-schema.md`

- [ ] Add section "Balance Management via Triggers"
- [ ] Document trigger logic for INSERT/UPDATE/DELETE
- [ ] Add warning: "NEVER manually update account.balance in application code"
- [ ] Explain rollback behavior

**Content to Add**:

```markdown
## Balance Management via Triggers

Account balances are **automatically maintained by PostgreSQL triggers**. The application code should NEVER manually update `accounts.balance`.

### Triggers

1. **transaction_insert_balance_trigger**: Increments/decrements balance on INSERT
2. **transaction_update_balance_trigger**: Reverts old amount, applies new amount on UPDATE
3. **transaction_delete_balance_trigger**: Reverts balance on DELETE

### Important

- Triggers execute AFTER the transaction row is inserted/updated/deleted
- Triggers respect transaction boundaries (rollback will undo balance changes)
- Balance updates are atomic (no race conditions)

### Migration

See `db/migrations/XXXX_balance_triggers.sql` for trigger definitions.
```

---

## ✅ Acceptance Criteria

- [ ] All 3 triggers (INSERT, UPDATE, DELETE) are created and tested
- [ ] Manual balance update logic removed from all API routes
- [ ] Race condition tests pass (concurrent transactions don't corrupt balance)
- [ ] Documentation updated with trigger behavior explanation
- [ ] Migration applied successfully to dev and production databases

---

## 🎯 Expected Outcome

**Before**:

- Manual balance updates in application code (error-prone)
- Risk of race conditions on concurrent transactions
- Balance can drift out of sync if API logic has bugs

**After**:

- Balance updates handled by database triggers (atomic, reliable)
- Zero race conditions (PostgreSQL handles concurrency)
- Simpler API code (less logic, fewer bugs)
- Balance always matches sum of transactions (enforced by DB)

---

## 📝 Notes

- This is a **refactoring sprint** (improves reliability without adding features)
- No frontend changes required
- Test thoroughly before deploying to production
- Consider adding a "Recalculate Balances" admin tool for data integrity checks

---

## 🔗 Related

- **Backlog**: Database Triggers for Balance (moved to this sprint)
- **Tech Debt**: Addressing manual balance calculation risk
- **Priority**: HIGH (data consistency is critical for finance app)
