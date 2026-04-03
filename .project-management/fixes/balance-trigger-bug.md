# Critical Bug: Balance Trigger Corruption

> **Severity**: 🔴 **CRITICAL**  
> **Status**: 🔥 **ACTIVE** - Sprint 07 in progress  
> **Discovered**: April 3, 2026  
> **Impact**: All accounts with expense transactions

---

## 🚨 Bug Description

The database trigger `update_account_balance()` has a critical bug that **corrupts account balances** by ignoring the transaction type and always **adding** the amount to the balance.

---

## 📍 Root Cause

**Buggy Code** (currently in production):

```sql
-- ❌ IGNORES transaction_type_id
IF (TG_OP = 'INSERT') THEN
  UPDATE accounts
  SET balance = balance + NEW.amount  -- ALWAYS ADDS
  WHERE id = NEW.account_id;
```

**Problem**: The trigger does not join with the `transaction_types` table to determine whether to add or subtract the amount.

---

## 💥 Impact

### Affected Transaction Types

| Type    | Expected Behavior | Actual Behavior | Status      |
| ------- | ----------------- | --------------- | ----------- |
| Income  | Add to balance    | Add to balance  | ✅ Correct  |
| Expense | Subtract from bal | **Add to bal**  | ❌ CRITICAL |
| Refund  | Add to balance    | Add to balance  | ✅ Correct  |

### Data Corruption Formula

Every expense transaction creates an error of **+2 × amount**:

```
Expected: balance - amount
Actual:   balance + amount
Net Error: +2 × amount
```

### Example

```
Starting balance: $1,000.00
User creates expense: -$50.00

Expected balance: $950.00
Actual balance:   $1,050.00  ❌
Corruption:       +$100.00 per expense
```

---

## 🎯 Affected Entities

- **Accounts**: All accounts that have expense transactions
- **Users**: All users who have created expense transactions
- **Time Period**: Since the trigger was first deployed (unknown date)

---

## 🔧 Proposed Fix

### Step 1: Diagnose Corruption

Create diagnostic script to identify corrupted accounts:

```sql
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
  ), 0) AS correct_balance,
  a.balance - COALESCE(SUM(...), 0) AS corruption_amount
FROM accounts a
LEFT JOIN transactions t ON t.account_id = a.id
LEFT JOIN transaction_types tt ON t.transaction_type_id = tt.id
GROUP BY a.id
HAVING a.balance <> correct_balance;
```

### Step 2: Fix Trigger + Recalculate Balances

Migration file: `drizzle/XXXX_fix_balance_trigger.sql`

**Actions**:

1. Drop buggy trigger and function
2. **Recalculate all account balances** from transaction history
3. Create corrected trigger that respects transaction types
4. Recreate trigger on transactions table

**Corrected Trigger Logic**:

```sql
-- Calculate balance delta based on transaction type
SELECT
  CASE
    WHEN tt.name IN ('income', 'refund') THEN NEW.amount
    WHEN tt.name = 'expense' THEN -NEW.amount
    ELSE 0
  END INTO balance_delta
FROM transaction_types tt
WHERE tt.id = NEW.transaction_type_id;

-- Apply delta
UPDATE accounts
SET balance = COALESCE(balance, 0) + balance_delta
WHERE id = NEW.account_id;
```

### Step 3: Create Verification Tool

Admin endpoint: `GET /api/admin/verify-balances`

**Purpose**: Identify accounts with balance mismatches post-migration

---

## ✅ Verification Criteria

- [ ] Diagnostic script identifies all corrupted accounts
- [ ] Migration successfully recalculates all balances
- [ ] Fixed trigger deployed and tested
- [ ] All test scenarios pass (INSERT, UPDATE, DELETE, concurrent)
- [ ] Zero balance mismatches after migration
- [ ] Admin verification endpoint returns empty array

---

## 📋 Tasks (Sprint 07)

1. 🔥 Assess data corruption (diagnostic script)
2. 🔥 Create migration to fix trigger
3. ✅ Verify API code (already confirmed correct)
4. 🧪 Test fixed trigger (all operations)
5. 🛠️ Create balance verification admin tool
6. 📚 Update architecture documentation

**Full Plan**: See `.project-management/sprints/sprint-07.md`

---

## 🔗 Related Files

**Trigger Location**:

- Database trigger: `update_account_balance()` on `transactions` table

**API Endpoints** (already correct, no changes needed):

- `POST /api/transactions` - Relies on trigger
- `PATCH /api/transactions/:id` - Relies on trigger
- `DELETE /api/transactions/:id` - Relies on trigger

**Verified Correct**:

- ✅ API does NOT manually update balances
- ✅ All endpoints rely on trigger (correct architecture)

---

## 📊 Priority & Effort

**Priority**: P0 - CRITICAL (blocks all other work)  
**Effort**: 2-3 days  
**Risk Level**: HIGH (data integrity compromised)  
**Deployment**: Deploy to production immediately after staging verification

---

## 🧪 Testing Strategy

**Pre-deployment (Staging)**:

1. Run diagnostic query to assess corruption
2. Count affected accounts and total error amount
3. Apply migration (recalculation + fix)
4. Run all test scenarios
5. Verify zero mismatches via admin endpoint

**Post-deployment (Production)**:

1. Monitor for 24 hours
2. Run verification endpoint daily for 1 week
3. Check error logs for trigger failures

---

## 📝 Notes

- This bug has been present since the trigger was first created
- The API code is **already correct** (does not manually update balances)
- The architecture (using triggers) is **correct**, only the implementation was buggy
- All expense transactions since trigger deployment are affected
- Balances will be recalculated from transaction history during migration
- No manual intervention required from users

---

## 🎓 Lessons Learned

1. **Always verify existing code before creating new features**
   - Original plan was to create triggers, but they already existed
   - Bug was discovered during pre-implementation verification

2. **Database triggers must be tested exhaustively**
   - Test all transaction types (income, expense, refund)
   - Test all operations (INSERT, UPDATE, DELETE)
   - Test edge cases (account transfers, type changes, concurrent ops)

3. **Create verification tools for critical data**
   - Admin endpoint for balance verification
   - Diagnostic scripts for corruption detection
   - Regular integrity checks

4. **Document trigger behavior thoroughly**
   - Add to architecture docs
   - Warn developers about manual balance updates
   - Document migration history

---

**Discovered by**: @aureo-dev during Sprint 07 pre-implementation review  
**Analyzed by**: @aureo-architect (technical analysis and fix plan)  
**Managed by**: @aureo-pm (Sprint 07 critical bug fix sprint)  
**Status**: 🚀 Ready for implementation
