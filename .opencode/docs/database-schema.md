# Database Schema - Aureo

PostgreSQL + Drizzle ORM.

## Tablas

### accounts

```typescript
{
  (id, name, userId, balance);
} // balance en milliunits
```

- Relations: transactions (1:N, CASCADE DELETE)
- Balance por triggers de DB

### categories

```typescript
{
  (id, name, userId, parentId);
} // parentId self-ref
```

- Relations: transactions (1:N, SET NULL), parent/children (self-ref)
- ⚠️ UI parent selector NO implementada

### transactions

```typescript
{
  (id, amount, payee, notes, date, accountId, categoryId, transactionTypeId);
}
```

- amount en milliunits
- accountId (CASCADE), categoryId (SET NULL), transactionTypeId (required)

### transactionTypes

```typescript
{
  (id, name);
} // "Income", "Expense", "Refund"
```

- ⚠️ UI selector NO implementada

## Relaciones

```
users (Clerk)
  ├─→ accounts (1:N, CASCADE)
  │     └─→ transactions
  ├─→ categories (1:N, SET NULL, self-ref)
  │     └─→ transactions
  └─→ transactionTypes
        └─→ transactions
```

## Validación Zod

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
npm run db:generate  # Generar
npm run db:migrate   # Ejecutar
npm run db:studio    # UI (localhost:5000)
```

## IDs

```typescript
import { createId } from "@paralleldrive/cuid2";
const id = createId(); // text format
```

## Row-Level Security

```typescript
// Directo
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

## ⚠️ CRÍTICO

**Balances**: NUNCA calcular en código. Triggers de DB lo manejan.
