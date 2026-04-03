# Architecture - Aureo

Feature-based architecture.

## Structure

```
/features/{domain}/
  ├── api/          # React Query hooks (use-get-*, use-create-*)
  ├── components/   # Feature UI (form, sheets)
  └── hooks/        # Feature state (Zustand)

/components/        # Shared UI (charts, filters, layout)
/components/ui/     # shadcn primitives
/hooks/             # Global utils (use-confirm, use-chart-controls)
/lib/               # Utils (utils.ts, types.ts, hono.ts)
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
  └── hooks/
      └── use-new-item.ts
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
