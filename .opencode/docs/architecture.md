# Architecture - Aureo

Feature-based architecture.

## Structure

```
/features/{domain}/
  ├── api/          # React Query hooks (use-get-*, use-create-*)
  ├── components/   # Feature UI (form, sheets)
  ├── hooks/        # Feature state (Zustand)
  ├── lib/          # Feature logic (business logic, algorithms)
  ├── types/        # Feature types
  └── lib/config.ts # Feature configuration constants (optional)

/components/        # Shared UI (charts, filters, layout)
/components/ui/     # shadcn primitives
/hooks/             # Global utils (use-confirm, use-chart-controls)
/lib/               # Utils (utils.ts, types.ts, hono.ts, api-errors.ts)
/app/
  ├── (auth)/       # Public routes
  ├── (dashboard)/  # Protected routes
  └── api/[[...route]]/  # Hono endpoints
```

## Data Flow

```
User Action → Component → React Query Hook → Hono API → Drizzle → PostgreSQL
Modal State → Zustand Store → Component Re-render
```

## Creating a Feature

1. **Structure**

```bash
features/items/
  ├── api/
  │   ├── use-get-items.ts
  │   └── use-create-item.ts
  ├── components/
  │   ├── item-form.tsx
  │   └── new-item-sheet.tsx
  ├── hooks/
  │   └── use-new-item.ts
  ├── lib/           # Business logic
  │   ├── item-processor.ts
  │   └── config.ts  # Feature constants (optional)
  └── types/
      └── item-types.ts
```

2. **API Hook**

```typescript
export const useGetItems = () => {
  return useQuery({
    queryKey: ["items"],
    queryFn: async () => {
      const response = await client.api.items.$get();
      const { data } = await response.json();
      return data;
    },
  });
};
```

3. **Zustand Store**

```typescript
export const useNewItem = create<State>((set) => ({
  isOpen: false,
  onOpen: () => set({ isOpen: true }),
  onClose: () => set({ isOpen: false }),
}));
```

4. **Component**

```typescript
export const NewItemSheet = () => {
  const { isOpen, onClose } = useNewItem();
  const mutation = useCreateItem();

  return <Sheet open={isOpen} onOpenChange={onClose}>{/* Form */}</Sheet>;
};
```

5. **API Endpoint**

```typescript
// app/api/[[...route]]/items.ts
export default new Hono().get("/", clerkMiddleware(), async (ctx) => {
  const auth = getAuth(ctx);
  if (!auth?.userId) return ctx.json({ error: "Unauthorized" }, 401);
  const data = await db
    .select()
    .from(items)
    .where(eq(items.userId, auth.userId));
  return ctx.json({ data });
});
```

## Naming

- Files: `kebab-case` (new-account-sheet.tsx, use-get-accounts.ts)
- Hooks: `useGetAccounts`, `useCreateAccount`, `useNewAccount`
- Query keys: `["accounts"]`, `["account", { id }]`

## Database Triggers

### Account Balance Trigger

PostgreSQL trigger `update_account_balance()` automatically maintains account balances based on transaction changes. **Never update balances manually in application code.**

**Trigger Details:**

- **Function:** `update_account_balance()`
- **Events:** `AFTER INSERT OR UPDATE OR DELETE ON transactions`
- **Behavior:**
  - **Income/Refund:** Adds `amount` to account balance
  - **Expense:** Subtracts `amount` from account balance
  - **Case-Insensitive:** Uses `LOWER(transaction_type.name)` for comparison
  - **Handles:** Account transfers, transaction type changes, NULL balances, concurrent updates

**Migration:** `drizzle/0002_fix_balance_trigger.sql`

**Historical Bug (Fixed 2026-04-03):**

- **Issue:** Trigger ignored `transaction_type_id` and always **added** amounts (case-sensitivity bug)
- **Impact:** 83.3% of accounts corrupted (€38,754.84 total corruption)
- **Formula:** Each expense created `+2× amount` error
- **Root Cause:** CASE statement compared against lowercase 'income'/'expense' but DB stores capitalized "Income"/"Expense"
- **Fix:** Added `LOWER()` to all transaction type comparisons + recalculated all balances

**Verification:**

```bash
# Diagnostic script
node scripts/diagnose-balance-corruption.mjs

# Test suite
node scripts/test-trigger-fix.mjs

# Admin endpoint
GET /api/admin/verify-balances
```

**Rules:**

- ✅ Let trigger handle all balance updates
- ❌ Never write `UPDATE accounts SET balance = ...` in API code
- ✅ Use specific `SELECT` statements (no `SELECT *`)
- ✅ Always validate transaction types exist before insertion

## Feature Configuration

**For complex features with many constants, create a centralized config file:**

```typescript
// features/csv-import/lib/config.ts
export const CSV_IMPORT_CONFIG = {
  DUPLICATE_DETECTION: {
    DATE_TOLERANCE_DAYS: 2,
    AMOUNT_TOLERANCE_PERCENT: 0.01,
    MATCH_THRESHOLD: 0.8,
  },
  BATCH_LIMITS: {
    MAX_TRANSACTIONS_PER_BATCH: 100,
    MAX_CATEGORIZATION_BATCH: 50,
    MAX_DUPLICATE_CHECK_BATCH: 500,
  },
  AI: {
    FEW_SHOT_EXAMPLES: 20,
    CONFIDENCE_THRESHOLD: 0.7,
  },
} as const;
```

**Benefits:**
- ✅ Single source of truth for magic numbers
- ✅ Easy to adjust thresholds/limits
- ✅ Self-documenting through naming
- ✅ Type-safe with `as const`

**When to use:**
- Features with 5+ hardcoded constants
- AI/ML features with tunable hyperparameters
- Batch processing with size limits
- Algorithms with threshold values
