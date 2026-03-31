# Sprint 04 - Core Logic & State Management

> **Status**: ⏳ Planned  
> **Start Date**: TBD (after Sprint 03)  
> **Goal**: Implement account transfers and ensure state synchronization  
> **Effort**: 1-2 weeks

---

## 🎯 Sprint Goal

Add account transfer functionality and ensure proper frontend state synchronization after all mutations.

---

## 📋 Tasks

### 1. Account Transfers (Core Feature)

- [ ] **Design Phase**: Design `transaction_pairs` table schema
  - [ ] Add `pair_id` UUID column to link debit/credit transactions
  - [ ] Document relationship (1 transfer = 2 transactions linked)
  - [ ] Consider foreign key constraints and cascading deletes

- [ ] **Database Migration**: Add "Transfer" transaction type
  - [ ] Create migration file `db/migrations/xxx_add_transfer_type.sql`
  - [ ] Seed "Transfer" type in `transaction_types` table
  - [ ] Update schema types

- [ ] **API Implementation**: Create transfer endpoint
  - [ ] Build `POST /api/transactions/transfer` endpoint
  - [ ] Implement atomic DB transaction (both inserts succeed or both fail)
  - [ ] Validate: `fromAccountId`, `toAccountId`, `amount > 0`
  - [ ] Create debit transaction (from account, negative amount)
  - [ ] Create credit transaction (to account, positive amount)
  - [ ] Link both with same `pair_id`

- [ ] **UI Implementation**: Transfer form
  - [ ] Create `features/transactions/components/transfer-form.tsx`
  - [ ] Add fromAccount selector (GenericSelect)
  - [ ] Add toAccount selector (exclude fromAccount from options)
  - [ ] Add amount input with validation
  - [ ] Add date picker (default: today)
  - [ ] Add notes field (optional)

- [ ] **Integration**: Wire up transfer flow
  - [ ] Create `features/transactions/api/use-create-transfer.ts` hook
  - [ ] Add transfer button to transactions page
  - [ ] Add transfer sheet modal
  - [ ] Invalidate accounts + transactions queries after success

- [ ] **Testing**: End-to-end validation
  - [ ] Test transfer between two accounts
  - [ ] Verify both transactions created with same `pair_id`
  - [ ] Verify balances update correctly in UI
  - [ ] Test error cases (insufficient balance, same account, etc.)

**Files**:

- `db/schema.ts` (add pair_id)
- `db/migrations/xxx_add_transfer_type.sql` (new)
- `db/migrations/xxx_add_pair_id_to_transactions.sql` (new)
- `app/api/[[...route]]/transactions.ts` (add /transfer endpoint)
- `features/transactions/components/transfer-form.tsx` (new)
- `features/transactions/components/transfer-sheet.tsx` (new)
- `features/transactions/api/use-create-transfer.ts` (new)
- `features/transactions/hooks/use-new-transfer.ts` (new)

**Effort**: 1.5 weeks  
**Priority**: HIGH

---

### 2. React Query Cache Invalidation Audit

- [ ] **Audit Mutation Hooks**: Review all mutation hooks for proper invalidation
  - [ ] `features/accounts/api/use-edit-account.ts` (already correct)
  - [ ] `features/accounts/api/use-delete-account.ts`
  - [ ] `features/accounts/api/use-bulk-delete-accounts.ts`
  - [ ] `features/categories/api/use-edit-category.ts` (already correct)
  - [ ] `features/categories/api/use-delete-category.ts`
  - [ ] `features/categories/api/use-bulk-delete-categories.ts`
  - [ ] `features/transactions/api/use-edit-transaction.ts`
  - [ ] `features/transactions/api/use-delete-transaction.ts`
  - [ ] `features/transactions/api/use-bulk-delete-transactions.ts`

- [ ] **Ensure Proper Invalidation**: Each mutation should invalidate related queries
  - Account mutations → `["accounts"]`, `["transactions"]`, `["summary"]`
  - Category mutations → `["categories"]`, `["transactions"]`, `["summary"]`
  - Transaction mutations → `["transactions"]`, `["accounts"]`, `["summary"]`

- [ ] **Test State Synchronization**: Verify UI updates after mutations
  - [ ] Create account → Verify appears in selectors immediately
  - [ ] Edit account → Verify name updates everywhere
  - [ ] Delete account → Verify removed from UI
  - [ ] Same for categories and transactions

**Files**:

- `features/*/api/use-*.ts` (9 files to review)

**Effort**: 4 hours  
**Priority**: MEDIUM

---

### 3. Zustand Modal State Review (Optional)

- [ ] **Verify Modal State Management**: Ensure all modals use factory pattern
  - [ ] Check all `use-new-*.ts` and `use-open-*.ts` hooks
  - [ ] Verify they use `createNewStore()` or `createOpenStore()`
  - [ ] Ensure consistency across all features

**Status**: ✅ Already completed in previous sprint (commit `4f56056`)  
**Action**: No work needed, just verification

**Effort**: 30 minutes  
**Priority**: LOW

---

## ✅ Definition of Done

- [ ] All tasks completed and checked off
- [ ] Account transfers work end-to-end (UI → API → DB)
- [ ] Both transfer transactions linked with `pair_id`
- [ ] All mutation hooks properly invalidate React Query cache
- [ ] UI updates immediately after all mutations
- [ ] All commits follow conventional commit format
- [ ] No TypeScript errors
- [ ] Comprehensive manual testing passed
- [ ] Sprint 02 file moved to `.project-management/done/`

---

## 📝 Notes

### Design Decisions

- **Transfer Type**: Add new "Transfer" type to `transaction_types` table
- **Linking**: Use `pair_id` UUID to link debit/credit transactions
- **Atomic**: Use DB transaction to ensure both inserts succeed together
- **Validation**: Prevent transfers to same account, validate amount > 0

### Future Enhancements (Not in this Sprint)

- Balance validation (prevent overdraft)
- Transfer cancellation (delete both paired transactions)
- Transfer editing (complex, defer to later)
