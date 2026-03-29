# Aureo Migration Helper

Ayuda con migraciones de base de datos usando Drizzle ORM siguiendo los patrones de Aureo.

## Cuándo Usar

- Crear nueva tabla
- Añadir/modificar columnas
- Crear relaciones
- Añadir constraints

## Workflow de Migración

### 1. Modificar Schema

```typescript
// db/schema.ts
export const newTable = pgTable("new_table", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

### 2. Generar Migración

```bash
npm run db:generate
```

Esto crea archivo en `drizzle/XXXX_descriptive_name.sql`

### 3. Revisar SQL Generado

```sql
-- drizzle/0001_add_new_table.sql
CREATE TABLE "new_table" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "user_id" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
```

### 4. Ejecutar Migración

```bash
npm run db:migrate
```

### 5. Crear Zod Schema

```typescript
// db/schema.ts
export const insertNewTableSchema = createInsertSchema(newTable);
```

## Patrones Comunes

### Nueva Tabla con Relaciones

```typescript
// Tabla principal
export const items = pgTable("items", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  userId: text("user_id").notNull(),
  categoryId: text("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
});

// Relaciones
export const itemsRelations = relations(items, ({ one }) => ({
  category: one(categories, {
    fields: [items.categoryId],
    references: [categories.id],
  }),
}));
```

### Self-Referencing (Jerarquía)

```typescript
export const categories = pgTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  parentId: text("parent_id").references((): AnyPgColumn => categories.id),
});

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
  }),
  children: many(categories, {
    relationName: "children",
  }),
}));
```

### Junction Table (Many-to-Many)

```typescript
export const transactionPairs = pgTable("transaction_pairs", {
  id: text("id").primaryKey(),
  debitTransactionId: text("debit_transaction_id")
    .references(() => transactions.id)
    .notNull(),
  creditTransactionId: text("credit_transaction_id")
    .references(() => transactions.id)
    .notNull(),
});

export const transactionPairsRelations = relations(
  transactionPairs,
  ({ one }) => ({
    debitTransaction: one(transactions, {
      fields: [transactionPairs.debitTransactionId],
      references: [transactions.id],
      relationName: "debit",
    }),
    creditTransaction: one(transactions, {
      fields: [transactionPairs.creditTransactionId],
      references: [transactions.id],
      relationName: "credit",
    }),
  }),
);
```

### Añadir Columna a Tabla Existente

```typescript
// db/schema.ts - Añadir campo
export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  userId: text("user_id").notNull(),
  balance: integer("balance"),
  description: text("description"), // NUEVO CAMPO
});
```

Ejecutar `npm run db:generate` genera:

```sql
ALTER TABLE "accounts" ADD COLUMN "description" text;
```

### Cambiar Constraint

```typescript
// Antes
categoryId: text("category_id").references(() => categories.id);

// Después (añadir onDelete)
categoryId: text("category_id").references(() => categories.id, {
  onDelete: "set null",
});
```

## Tipos de onDelete

```typescript
onDelete: "cascade"; // Borrar relacionados
onDelete: "set null"; // Setear a NULL
onDelete: "restrict"; // Prevenir borrado
onDelete: "no action"; // No hacer nada (default)
```

## Tipos de Datos

```typescript
text("field"); // VARCHAR
integer("field"); // INTEGER
real("field"); // REAL
boolean("field"); // BOOLEAN
timestamp("field"); // TIMESTAMP
json("field"); // JSON
jsonb("field"); // JSONB
```

## Modificadores

```typescript
.notNull()                       // NOT NULL
.primaryKey()                    // PRIMARY KEY
.unique()                        // UNIQUE
.default(value)                  // DEFAULT value
.defaultNow()                    // DEFAULT now()
.references(() => table.id)      // FOREIGN KEY
```

## Rollback

Si necesitas revertir:

```bash
# Crear migración manual de rollback
# drizzle/XXXX_rollback_feature.sql
DROP TABLE "new_table";
```

## Seed Data

Para insertar data inicial:

```typescript
// scripts/seed.ts
import { db } from "@/db/drizzle";
import { transactionTypes } from "@/db/schema";

async function seed() {
  await db.insert(transactionTypes).values([
    { id: "income", name: "Income" },
    { id: "expense", name: "Expense" },
    { id: "refund", name: "Refund" },
  ]);
}

seed();
```

## Drizzle Studio

Visualizar DB en navegador:

```bash
npm run db:studio  # http://localhost:5000
```

## Checklist

- [ ] Modificar `db/schema.ts`
- [ ] Ejecutar `npm run db:generate`
- [ ] Revisar SQL generado en `drizzle/`
- [ ] Ejecutar `npm run db:migrate`
- [ ] Crear Zod schema con `createInsertSchema`
- [ ] Definir relaciones si aplica
- [ ] Actualizar tipos en `lib/types.ts` si necesario
- [ ] Probar con Drizzle Studio

## Amounts en Milliunits

⚠️ **CRÍTICO**: Para campos de amount:

```typescript
// DB
amount: integer("amount").notNull(); // Milliunits (× 1000)

// Zod schema
export const insertTransactionSchema = createInsertSchema(transactions, {
  date: z.coerce.date(),
  amount: z.number(), // UI usa number normal
});

// Conversión en API
const [data] = await db.insert(transactions).values({
  ...values,
  amount: convertAmountToMilliunits(values.amount), // UI → DB
});
```

## Balances

⚠️ **NUNCA** actualizar balances en código.

Los triggers de DB lo manejan automáticamente.
