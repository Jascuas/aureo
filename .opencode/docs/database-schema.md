# Database Schema - Aureo

> Historical reference only. Verify schema and migration claims against
> `db/schema.ts`, `drizzle/`, the Drizzle journal, and approved live evidence.
> Commands and examples here are not operational authorization.

PostgreSQL + Drizzle ORM.

## Tables

### accounts

```typescript
{
  (id, name, userId, balance);
} // balance in milliunits
```

- Relations: transactions (1:N, CASCADE DELETE)
- Balance managed by DB triggers

### categories

```typescript
{
  (id, name, userId, parentId);
} // parentId self-ref
```

- Relations: transactions (1:N, SET NULL), parent/children (self-ref)
- ⚠️ UI parent selector NOT implemented

### transactions

```typescript
{
  (id, amount, payee, notes, date, accountId, categoryId, transactionTypeId);
}
```

- amount in milliunits
- accountId (CASCADE), categoryId (SET NULL), transactionTypeId (required)

### transaction_types

```typescript
{
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
}
```

**Available Types:**
- `income` - Income
- `expense` - Expense
- `refund` - Refund

Transfer is unsupported until its paired-entry model, import behavior, and
historical-data plan are separately approved.

**API Endpoint:**
- `GET /api/transaction-types` - List all types (auth required)

**Usage in code:**
```typescript
// Seed scripts import SUPPORTED_TRANSACTION_TYPE_IDS from
// features/transaction-types/lib/transaction-types.ts.
transactionTypeId: isExpense 
  ? SUPPORTED_TRANSACTION_TYPE_IDS[1] // Expense
  : SUPPORTED_TRANSACTION_TYPE_IDS[0] // Income
```

- The UI selector and write endpoints only accept these three stable IDs.

## Relations

```
users (Clerk)
  ├─→ accounts (1:N, CASCADE)
  │     └─→ transactions
  ├─→ categories (1:N, SET NULL, self-ref)
  │     └─→ transactions
  └─→ transactionTypes
        └─→ transactions
```

## Zod Validation

```typescript
// db/schema.ts
export const insertAccountSchema = createInsertSchema(accounts);
export const insertTransactionSchema = createInsertSchema(transactions, {
  date: z.coerce.date(),
});

// Usage
const formSchema = insertAccountSchema.pick({ name: true });
zValidator("json", insertAccountSchema.omit({ id: true }));
```

## Migrations

```bash
pnpm db:generate  # Generate
pnpm db:migrate   # Execute; mutating and requires explicit approval
pnpm db:studio    # UI (localhost:5000)
```

## IDs

```typescript
import { createId } from "@paralleldrive/cuid2";
const id = createId(); // text format
```

## Row-Level Security

```typescript
// Direct
.where(eq(accounts.userId, auth.userId))

// Via JOIN (transactions)
.innerJoin(accounts, eq(transactions.accountId, accounts.id))
.where(eq(accounts.userId, auth.userId))
```

## Amounts

```typescript
// Insert (UI → DB)
amount: convertAmountToMilliunits(100); // 100 → 100000

// Read (DB → UI)
convertAmountFromMilliunits(data.amount); // 100000 → 100
```

## ⚠️ CRITICAL

**Balances**: NEVER calculate in code. DB triggers handle them.
