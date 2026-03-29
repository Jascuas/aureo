# Database Schema - Aureo Finance Platform

PostgreSQL database con Drizzle ORM.

---

## Tablas Principales

### `accounts`

Cuentas financieras del usuario (Checking, Savings, etc.)

```typescript
{
  id: text (PK)
  name: text NOT NULL
  userId: text NOT NULL
  balance: integer           // en milliunits (× 1000)
}
```

**Relaciones**:

- `transactions`: one-to-many (CASCADE DELETE)

**Notas**:

- Balance actualizado por triggers de DB
- Borrar cuenta borra todas sus transacciones

---

### `categories`

Categorías para organizar transacciones (Food, Rent, etc.)

```typescript
{
  id: text (PK)
  name: text NOT NULL
  userId: text NOT NULL
  parentId: text (FK → categories.id)  // Self-referencing
}
```

**Relaciones**:

- `transactions`: one-to-many (SET NULL)
- `parent`: self-referencing one-to-one
- `children`: self-referencing one-to-many

**Notas**:

- Soporte para jerarquía parent-child
- Borrar categoría NO borra transacciones (SET NULL)
- ⚠️ UI para parent selector NO implementada

---

### `transactions`

Transacciones financieras (ingresos, gastos, etc.)

```typescript
{
  id: text (PK)
  amount: integer NOT NULL       // en milliunits (× 1000)
  payee: text NOT NULL
  notes: text
  date: timestamp NOT NULL
  accountId: text NOT NULL (FK → accounts.id, CASCADE)
  categoryId: text (FK → categories.id, SET NULL)
  transactionTypeId: text NOT NULL (FK → transactionTypes.id)
}
```

**Relaciones**:

- `account`: many-to-one (CASCADE DELETE)
- `category`: many-to-one (SET NULL)
- `transactionType`: many-to-one

**Notas**:

- Amount en milliunits (× 1000)
- Positivo = Income, Negativo = Expense
- Borrar account → CASCADE delete transactions
- Borrar category → SET NULL en transactions

---

### `transactionTypes`

Tipos de transacciones disponibles

```typescript
{
  id: text (PK)
  name: text NOT NULL UNIQUE    // "Income", "Expense", "Refund"
}
```

**Valores actuales**:

- `"Income"`: Ingresos (suma al balance)
- `"Expense"`: Gastos (resta del balance)
- `"Refund"`: Devoluciones (reduce expenses)

**Notas**:

- ⚠️ UI para selector de tipo NO implementada
- Form actualmente hardcodea `transactionTypeId: ""`

---

## Relaciones Visuales

```
users (Clerk)
  │
  ├─→ accounts (1:N)
  │     │
  │     └─→ transactions (1:N, CASCADE)
  │
  ├─→ categories (1:N)
  │     │
  │     ├─→ parent (self-ref)
  │     ├─→ children (self-ref)
  │     └─→ transactions (1:N, SET NULL)
  │
  └─→ transactionTypes (N:1)
        └─→ transactions (1:N)
```

---

## Schemas de Validación (Zod)

### Drizzle → Zod

```typescript
// db/schema.ts
export const insertAccountSchema = createInsertSchema(accounts);
export const insertCategorySchema = createInsertSchema(categories);
export const insertTransactionSchema = createInsertSchema(transactions, {
  date: z.coerce.date(), // Custom coercion
});
```

### Uso en Forms

```typescript
// Partial schema (solo campos del form)
const formSchema = insertAccountSchema.pick({ name: true });
type FormValues = z.infer<typeof formSchema>;
```

### Uso en API

```typescript
// Validación completa
zValidator("json", insertAccountSchema);

// Validación parcial para updates
zValidator("json", insertAccountSchema.pick({ name: true }));

// Omitir campos
zValidator("json", insertTransactionSchema.omit({ id: true }));
```

---

## Migraciones

### Generar migración

```bash
npm run db:generate
```

### Ejecutar migración

```bash
npm run db:migrate
```

### Drizzle Studio (visual DB editor)

```bash
npm run db:studio  # http://localhost:5000
```

---

## IDs

**Generación**: CUID2 via `@paralleldrive/cuid2`

```typescript
import { createId } from "@paralleldrive/cuid2";

const id = createId(); // "clh3x..."
```

**Formato**: Text strings (no integers)

---

## Queries Comunes

### Row-Level Security

Todas las queries filtran por `userId`:

```typescript
// accounts
const data = await db
  .select()
  .from(accounts)
  .where(eq(accounts.userId, auth.userId));

// transactions (via JOIN con accounts)
const data = await db
  .select()
  .from(transactions)
  .innerJoin(accounts, eq(transactions.accountId, accounts.id))
  .where(eq(accounts.userId, auth.userId));
```

### Conversión de Amounts

```typescript
// Insertar (UI → DB)
await db.insert(transactions).values({
  amount: convertAmountToMilliunits(100), // 100 → 100000
});

// Leer (DB → UI)
const amount = convertAmountFromMilliunits(data.amount); // 100000 → 100
```

---

## Triggers (Database Level)

⚠️ **CRÍTICO**: Los balances se actualizan via triggers de PostgreSQL.

**NO implementar lógica de balance en código**.

Los triggers automáticamente:

- Suman/restan al crear transacción
- Ajustan al editar amount
- Revierten al borrar transacción
