# Database Schema - Aureo

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
- `txp8azr12yckwhv9odnb30elu` - Income
- `txd4b7kzpn2lmjv6cuqf9s3yw` - Expense
- `txk7m0ugzv4npbqy5e12srj9w` - Refund

**API Endpoint:**
- `GET /api/transaction-types` - List all types (auth required)

**Usage in code:**
```typescript
// Seed/migration scripts - use actual IDs
transactionTypeId: isExpense 
  ? "txd4b7kzpn2lmjv6cuqf9s3yw" // Expense
  : "txp8azr12yckwhv9odnb30elu" // Income
```

- ⚠️ UI selector NOT implemented

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
npm run db:generate  # Generate
npm run db:migrate   # Execute
npm run db:studio    # UI (localhost:5000)
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
