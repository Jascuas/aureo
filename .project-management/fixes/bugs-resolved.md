# Resolved Bugs Archive

> **Purpose**: Historical record of bugs that have been fixed  
> **Last Updated**: March 30, 2026

---

## ✅ Fixed Bugs

### Balance Calculation Logic (Sprint 01)

**Severity**: 🟡 High

**Description**:
Balance card in DataGrid shows incorrect percentage change. Was calculating projected future balance instead of period change.

**Root Cause**:
`overview.ts:96-98` compared current balance with projected balance, not period changes.

**Fix Applied**:

- [x] Changed to compare period change with previous period change
- [x] Verified DataGrid displays correct percentage

**Files Fixed**:

- `app/api/[[...route]]/summary/overview.ts:96-98`

**Fixed In**: Sprint 01 (March 30, 2026)

---

### Category Bulk Delete Validator Bug (Sprint 02)

**Severity**: 🟢 Medium

**Description**:
Category bulk delete endpoint was using wrong Zod schema for validation.

**Root Cause**:
Used `insertCategorySchema.pick()` instead of `z.object({ ids: z.array() })` for bulk delete.

**Fix Applied**:

- [x] Replaced with correct schema in `categories.ts` bulk-delete endpoint

**Files Fixed**:

- `app/api/[[...route]]/categories.ts`

**Fixed In**: Sprint 02 - Commit `07a6b6d`

---

### Console.log in Production (Sprint 01)

**Severity**: 🔵 Low

**Description**:
Debug `console.log("TOPPPPP", top)` left in production code.

**Fix Applied**:

- [x] Removed debug statement

**Fixed In**: Sprint 01 - Commit `24ae014`

---

### Account Balance NULL Issue (Sprint 01)

**Severity**: 🔴 Critical

**Description**:
Accounts created with NULL balance caused crashes.

**Root Cause**:
`POST /api/accounts` didn't set default balance value.

**Fix Applied**:

- [x] Set `balance: 0` as default in account creation

**Files Fixed**:

- `app/api/[[...route]]/accounts.ts`

**Fixed In**: Sprint 01 - Commit `24ae014`

---

## 📊 Bug Statistics

- **Total Bugs Fixed**: 4
- **Critical Bugs Fixed**: 1
- **High Severity Fixed**: 1
- **Medium Severity Fixed**: 1
- **Low Severity Fixed**: 1
- **Average Fix Time**: < 1 day
