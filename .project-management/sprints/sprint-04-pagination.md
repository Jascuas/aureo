# Sprint 04: Pagination Implementation

> **Status**: 🚧 In Progress  
> **Start Date**: April 3, 2026  
> **End Date**: April 10, 2026  
> **Duration**: 1 week  
> **Priority**: HIGH (scalability blocker)

---

## 🎯 Goal

Implement cursor-based pagination for transactions to prevent performance degradation with large datasets (1000+ transactions).

---

## 📋 Tasks

### Backend: API Pagination

- [ ] Implement cursor-based pagination in `GET /api/transactions`
  - Use `date + id` as cursor for stable ordering
  - Add query params: `limit`, `cursor`
  - Return `nextCursor` in response
  - **File**: `app/api/[[...route]]/transactions.ts:39-62`

### Frontend: DataTable Pagination

- [ ] Add pagination controls to DataTable component
  - Page size selector: 10/25/50/100 per page
  - Previous/Next buttons
  - Current page indicator
  - **File**: `components/data-table.tsx`

### Frontend: React Query Integration

- [ ] Update `use-get-transactions` hook to support pagination
  - Accept `limit` and `cursor` params
  - Handle `nextCursor` from API response
  - Implement `fetchNextPage` for infinite scroll (optional)
  - **File**: `features/transactions/api/use-get-transactions.ts`

### UX Decision

- [ ] Decide pagination strategy:
  - **Option A**: Page-based (1, 2, 3... with Next/Prev)
  - **Option B**: Infinite scroll (Load More button)
  - **Option C**: Hybrid (pages + infinite scroll)

### Testing

- [ ] Test with 100 transactions
- [ ] Test with 1000+ transactions (seed database)
- [ ] Test cursor edge cases (empty results, last page)
- [ ] Test performance improvement (compare before/after)

---

## 🔧 Technical Details

### Current Problem

```typescript
// ❌ Current: Loads ALL transactions
const data = await db
  .select({
    /* ... */
  })
  .from(transactions)
  .where(eq(accounts.userId, userId));
// No LIMIT/OFFSET → breaks with 1000+ rows
```

### Proposed Solution

```typescript
// ✅ Cursor-based pagination
const data = await db
  .select({
    /* ... */
  })
  .from(transactions)
  .where(
    and(
      eq(accounts.userId, userId),
      cursor ? lt(transactions.date, cursorDate) : undefined,
    ),
  )
  .orderBy(desc(transactions.date), desc(transactions.id))
  .limit(limit + 1); // +1 to check if more pages exist

const hasMore = data.length > limit;
const items = hasMore ? data.slice(0, limit) : data;
const nextCursor = hasMore ? encodeCursor(items[items.length - 1]) : null;
```

---

## 📦 Deliverables

- [ ] Working pagination in transactions table
- [ ] API endpoint with cursor support
- [ ] Updated React Query hook
- [ ] Performance test results (before/after)

---

## 🚀 Success Criteria

- ✅ DataTable shows only 25 transactions by default
- ✅ User can change page size (10/25/50/100)
- ✅ Navigation works (Previous/Next or Load More)
- ✅ API response time < 200ms with 10,000 transactions
- ✅ No UI lag when rendering paginated data

---

## 📝 Notes

- **Why cursor-based?** More stable than offset-based when data changes (new transactions added)
- **Why `date + id`?** Ensures stable ordering even with same-date transactions
- **Future**: Consider adding filters (by account, category, date range) to pagination

---

## 🐛 Risks

- **Breaking change**: Frontend needs update to handle new API response shape
- **Migration**: Existing `use-get-transactions` calls need update
- **UX**: Need to decide pagination strategy early (page-based vs infinite scroll)

---

## 🔗 Related

- **Tech Debt**: Pagination Implementation (HIGH priority)
- **Files**: `app/api/[[...route]]/transactions.ts`, `components/data-table.tsx`, `features/transactions/api/use-get-transactions.ts`
