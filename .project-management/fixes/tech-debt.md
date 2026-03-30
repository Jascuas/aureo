# Technical Debt

> **Purpose**: Code quality improvements and refactoring tasks  
> **Last Updated**: March 30, 2026

---

## 🏗️ Architecture & Performance

### Component Organization (components/ vs features/)

**Task**: Review and ensure strict separation between shared and feature-specific components

**Current State**:

- ✅ Columns moved from `app/(dashboard)/*/columns.tsx` to `features/*/components/` (commit `2363182`)
- Shared UI components in `components/` (Button, Input, Select, etc.)
- Feature-specific components in `features/*/components/`

**Action Items**:

- [ ] Audit all components in `components/` to ensure they're truly shared
- [ ] Check for feature-specific logic in shared components
- [ ] Move any feature-specific components from `components/` to appropriate `features/*/components/`
- [ ] Document component organization rules in `.opencode/docs/rules.md`
- [ ] Verify imports follow pattern: `@/components/` for shared, relative for feature-specific

**Files to Review**:

- `components/*.tsx` (all files)
- `features/*/components/*.tsx` (verify placement)

**Effort**: 2-3 hours  
**Priority**: MEDIUM

---

### Pagination Implementation

**Problem**: `GET /api/transactions` loads all transactions client-side

**Current State**:

- No LIMIT/OFFSET in API
- DataTable renders all rows at once
- Will break with 1000+ transactions

**Solution**:

- [ ] Implement cursor-based pagination in API (use `date + id` as cursor)
- [ ] Add pagination controls to DataTable (10/25/50/100 per page)
- [ ] Update React Query hooks to support pagination
- [ ] Consider infinite scroll vs page-based loading

**Files**:

- `app/api/[[...route]]/transactions.ts:39-62`
- `components/data-table.tsx`
- `features/transactions/api/use-get-transactions.ts`

**Effort**: 1 week  
**Priority**: HIGH (scalability blocker)

---

### Error Boundaries

**Problem**: No error boundaries → full page crashes on errors

**Solution**:

- [ ] Create reusable `components/error-boundary.tsx` component
- [ ] Add error boundary to `app/(dashboard)/layout.tsx` (layout level)
- [ ] Add error boundaries to page level (transactions, accounts, categories)
- [ ] Add error boundaries to sheets/modals/charts (component level)
- [ ] Design user-friendly error messages

**Files**:

- `components/error-boundary.tsx` (new)
- `app/(dashboard)/layout.tsx`
- 3 page files

**Effort**: 2 days  
**Priority**: MEDIUM

---

### Loading States on Mutations

**Problem**: No visual feedback during mutations

**Current State**:

- Chart/data loading states exist (ChartLoading, SpendingPieLoading, DataCardLoading)
- Form submissions have no loading indicators

**Solution**:

- [ ] Add `disabled={isPending}` to all form submit buttons
- [ ] Add `<Loader2>` spinner inside buttons during mutations
- [ ] Ensure all mutation hooks return `isPending` state
- [ ] Test with slow network to verify UX

**Files**:

- `features/accounts/components/account-form.tsx`
- `features/categories/components/category-form.tsx`
- `features/transactions/components/transaction-form.tsx`

**Effort**: 3 hours  
**Priority**: LOW (UX improvement)

---

### Soft Delete Pattern

**Problem**: Hard deletes lose data history

**Solution**:

- [ ] Create migration to add `deleted_at` timestamp to accounts, categories, transactions
- [ ] Update all queries to filter `WHERE deleted_at IS NULL` by default
- [ ] Add `DELETE /api/*/restore/:id` endpoints
- [ ] Create admin view to show deleted items
- [ ] Update forms to show "Archive" instead of "Delete"

**Files**:

- `db/migrations/xxx_add_soft_delete.sql` (new)
- `db/schema.ts`
- All API routes (8 files)

**Effort**: 1 week  
**Priority**: LOW (nice-to-have)

---

## 🔍 Code Quality

### React Query / Zustand Cache Invalidation

**Status**: ✅ **COMPLETED** in Sprint 2

**What was fixed**:

- ✅ `use-create-account.ts` now invalidates `["transactions"]`, `["summary"]`
- ✅ `use-create-category.ts` now invalidates related queries
- ✅ `use-edit-account.ts` and `use-edit-category.ts` already correct

**Commit**: `f069eb9` - "refactor: improve type consistency and query invalidation patterns"

---

### Component Organization (components/ vs features/)

**Status**: ✅ **COMPLETED** in Sprint 2

**What was fixed**:

- ✅ Columns moved from `app/(dashboard)/*/columns.tsx` to `features/*/components/columns.tsx`
- ✅ Clear separation: `components/` = shared UI, `features/` = domain-specific

**Commit**: `2363182` - "refactor: move column definitions from app/ to features/"

---

## 📝 Future Refactoring Ideas

### Consider These Later

- [ ] Extract chart configuration to factory pattern (similar to Zustand stores)
- [ ] Consolidate summary endpoints into single parameterized endpoint
- [ ] Add OpenAPI/Swagger documentation for API
- [ ] Consider splitting large form components into smaller sub-components
- [ ] Evaluate Drizzle query builder patterns for consistency

---

## ✅ Completed Refactors (Sprint 2)

- ✅ Auth middleware extraction (25 instances → 1 reusable function)
- ✅ Date parsing utils (5 duplicates → 1 function)
- ✅ SQL CASE helpers (3 duplicates → reusable helpers)
- ✅ Zustand factory pattern (6 identical stores → 2 factory functions)
- ✅ Type consistency (interface → type)
- ✅ Query invalidation patterns fixed
- ✅ File structure (columns moved to features/)

**Impact**: -200+ lines of duplication removed
