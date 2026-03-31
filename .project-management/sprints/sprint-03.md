# Sprint 03 - Critical Fixes

> **Status**: 🚧 Ready to Start  
> **Start Date**: TBD (after Sprint 02 completed)  
> **Goal**: Fix balance calculation bug and CSV import issue  
> **Effort**: 1-2 days

---

## 🎯 Sprint Goal

Fix critical data accuracy issues and ensure all transaction flows work correctly.

---

## 📋 Tasks

### 1. Balance Calculation Logic Fix ⚠️ HIGH PRIORITY

- [ ] Fix balance calculation in `app/api/[[...route]]/summary/overview.ts:96-98`
- [ ] Change from projected balance to period change comparison
- [ ] Verify DataGrid displays correct percentage
- [ ] Test with different date ranges to ensure accuracy

**Current (Wrong)**:

```typescript
const changeBalance = balance + currentPeriod.income - currentPeriod.expenses;
const balanceChangePtc = calculatePercentageChange(balance, changeBalance);
```

**Expected (Correct)**:

```typescript
const balanceChange = currentPeriod.income - currentPeriod.expenses;
const previousBalanceChange = lastPeriod.income - lastPeriod.expenses;
const balanceChangePtc = calculatePercentageChange(
  balanceChange,
  previousBalanceChange,
);
```

**Files**:

- `app/api/[[...route]]/summary/overview.ts:96-98`
- Verify: `components/data-grid.tsx:22-26`

**Effort**: 30 minutes  
**Priority**: HIGH

---

### 2. CSV Import Transaction Type Handling

- [ ] Analyze current CSV import flow in `components/import-card.tsx:54-103`
- [ ] Add auto-detect logic: `amount < 0` → "Expense", `amount > 0` → "Income"
- [ ] Add support for optional `transactionType` column in CSV
- [ ] Update bulk create mutation to handle `transactionTypeId`
- [ ] Test CSV import with various scenarios (with/without type column)

**Implementation Options**:

- ✅ Option A: Auto-detect from amount sign
- ✅ Option C: Support CSV column override
- ❌ Option B: Dropdown (adds complexity, skip for now)

**Files**:

- `components/import-card.tsx:54-103`
- `features/transactions/api/use-bulk-create-transactions.ts`

**Effort**: 4 hours  
**Priority**: MEDIUM

---

## ✅ Definition of Done

- [ ] All tasks completed and checked off
- [ ] Balance calculation shows correct percentage changes
- [ ] CSV import works with and without transactionType column
- [ ] All commits follow conventional commit format (`fix:`, `feat:`)
- [ ] No TypeScript errors
- [ ] Manual testing passed for both features
- [ ] Sprint 01 file moved to `.project-management/done/`

---

## 📝 Notes

### Already Completed (Previous Sprints)

- ✅ Transaction type selector in UI (commit `dd883e7`)
- ✅ Category parent selector in UI (commit `89e27df`)
- ✅ Conventional commits already being followed

### Deferred to Future Sprints

- Account transfers → Moved to Sprint 02 (requires `transaction_pairs` table design)
- Query invalidation → Already fixed in previous sprint (commit `f069eb9`)
