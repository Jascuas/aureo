# Technical Debt

> **Purpose**: Code quality improvements and refactoring tasks  
> **Last Updated**: April 3, 2026 (Reviewed and updated by @aureo-dev)

---

## 🏗️ Architecture & Performance

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

**Status**: ✅ **PARTIALLY IMPLEMENTED**

**Current State**:

- ✅ All sheets have `isPending` state (new-_, edit-_)
- ✅ Sheets stay open during mutations: `open={isOpen || isPending}`
- ✅ Edit sheets show `<Loader2>` spinners while loading data
- ✅ Forms receive `disabled={isPending}` prop from parent sheets
- ❌ **MISSING**: Submit buttons don't show loading spinner inside

**Remaining Work**:

- [ ] Add `<Loader2>` icon inside submit buttons (currently just disabled)
- [ ] Change button text during submit: "Create account" → "Creating..."

**Example**:

```tsx
<Button className="w-full" disabled={isPending}>
  {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
  {isPending ? "Creating..." : "Create account"}
</Button>
```

**Files**:

- `features/accounts/components/account-form.tsx`
- `features/categories/components/category-form.tsx`
- `features/transactions/components/transaction-form.tsx`

**Effort**: 1 hour  
**Priority**: LOW (minor UX polish)

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

## 📝 Future Refactoring Ideas

### Consider These Later

#### 1. Extract Chart Configuration to Factory Pattern

**Status**: ⚠️ **EVALUATE FIRST**

**Current State**:

- All chart variants define configuration inline (colors, gradients, tooltips)
- Example: `AreaVariant`, `PieVariant`, `RadarVariant` each repeat similar config

**Potential Benefit**:

- Centralized theming (change all chart colors in one place)
- Consistent visual style across all charts

**Potential Downside**:

- Over-abstraction (current code is readable and variant-specific)
- Each chart type has unique requirements (area ≠ pie ≠ radar)

**Recommendation**: ⏸️ **SKIP FOR NOW**  
**Reason**: Current code is maintainable. Factory would add complexity without clear ROI.

---

#### 2. Consolidate Summary Endpoints

**Status**: ✅ **CURRENT STRUCTURE IS CORRECT**

**Current State**:

- `/api/summary/overview` → Income/expense totals with period comparison
- `/api/summary/over-time` → Daily time-series data for balance chart
- `/api/summary/by-category` → Top N categories by spend

**Why separate is better**:

- Different query patterns (aggregation vs time-series vs grouping)
- Different response shapes (scalars vs arrays)
- Different use cases (cards vs charts vs pie charts)
- Performance: Each endpoint optimized for specific query

**Recommendation**: ✅ **KEEP AS-IS**  
**Reason**: Premature abstraction. Current API is RESTful and follows single responsibility.

---

#### 3. Add OpenAPI/Swagger Documentation

**Status**: 🔄 **FUTURE ENHANCEMENT**

**Current State**:

- Zod schemas define validation for all endpoints
- No generated API docs

**Potential Benefit**:

- Auto-generated API documentation
- Type-safe client generation
- Better DX for frontend developers

**Implementation**:

- Use `@hono/zod-openapi` (Hono has built-in support)
- Generate Swagger UI at `/api/docs`

**Files**:

- `app/api/[[...route]]/route.ts` (add OpenAPI middleware)
- All route files (convert to OpenAPI-compatible Hono routes)

**Effort**: 2 days  
**Priority**: LOW (nice-to-have for larger teams)

**Recommendation**: ⏸️ **DEFER**  
**Reason**: Solo/small team project. Zod validation is sufficient for now.

---

#### 4. Split Large Form Components

**Status**: ✅ **CURRENT STRUCTURE IS ACCEPTABLE**

**Current State**:

- `TransactionForm` is 261 lines (date, account, category, type, payee, amount, notes)
- `AccountForm`, `CategoryForm` are smaller (~100 lines)

**Analysis**:

- TransactionForm has 7 fields → reasonable for a single component
- Each field is already a FormField (shadcn/ui pattern)
- Splitting would create:
  - `TransactionBasicFields.tsx`
  - `TransactionAmountFields.tsx`
  - `TransactionMetaFields.tsx`

**Recommendation**: ✅ **KEEP AS-IS**  
**Reason**: 261 lines is NOT large for a form. Splitting would hurt co-location and readability.

**Trigger for refactor**: If form exceeds 500 lines OR has complex conditional logic.

---

#### 5. Evaluate Drizzle Query Patterns

**Status**: ✅ **CURRENT PATTERNS ARE CORRECT**

**Current State**:

- All queries use explicit SELECT (no `SELECT *`)
- Consistent use of `innerJoin` for required relations
- Helper functions for SQL expressions (`incomeAmountSql`, `expensesAmountSql`)
- All queries filter by `userId` (security)

**Patterns in use**:

```typescript
// ✅ Good: Explicit SELECT with specific fields
db.select({
  id: transactions.id,
  amount: transactions.amount,
  // ... specific fields
});

// ✅ Good: SQL helpers for complex expressions
const incomeAmountSql = sql`...`;
db.select({ income: incomeAmountSql })

  // ✅ Good: Consistent auth filtering
  .where(eq(accounts.userId, userId));
```

**Recommendation**: ✅ **NO CHANGES NEEDED**  
**Reason**: Code already follows Drizzle best practices.

---

## Summary of Refactoring Ideas

| Idea                          | Status        | Action                             |
| ----------------------------- | ------------- | ---------------------------------- |
| Chart Factory Pattern         | ⏸️ Skip       | Over-abstraction, no clear benefit |
| Consolidate Summary Endpoints | ✅ Keep as-is | Current structure is correct       |
| OpenAPI Documentation         | ⏸️ Defer      | Low priority for small teams       |
| Split Large Forms             | ✅ Keep as-is | Forms are not too large            |
| Drizzle Query Patterns        | ✅ Keep as-is | Already following best practices   |

**Conclusion**: All "refactoring ideas" have been evaluated. **NONE require action** at this time.

---
