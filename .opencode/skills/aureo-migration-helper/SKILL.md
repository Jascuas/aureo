# Aureo Migration Helper

Migraciones con Drizzle ORM.

## Cuándo Usar

- Crear tabla, añadir columnas, relaciones, constraints

## Workflow

1. **Modificar schema**: `db/schema.ts`
2. **Generar migración**: `npm run db:generate` → crea `drizzle/XXXX.sql`
3. **Revisar SQL**: verificar cambios generados
4. **Ejecutar**: `npm run db:migrate`
5. **Zod schema**: `createInsertSchema(tabla)`

## Patrones

**Nueva tabla**:

```typescript
export const items = pgTable("items", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  userId: text("user_id").notNull(),
  categoryId: text("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
});
export const itemsRelations = relations(items, ({ one }) => ({
  category: one(categories, {
    fields: [items.categoryId],
    references: [categories.id],
  }),
}));
```

**Self-referencing**: `parentId: text().references((): AnyPgColumn => table.id)`

**Junction table**: Dos FK + relaciones con `relationName`

**Añadir columna**: Solo agregar campo en schema → `db:generate` crea `ALTER TABLE`

## onDelete

`cascade` (borrar relacionados) | `set null` | `restrict` (prevenir) | `no action` (default)

## Tipos

`text | integer | real | boolean | timestamp | json | jsonb`

## Modificadores

`.notNull() | .primaryKey() | .unique() | .default(val) | .defaultNow() | .references()`

## Drizzle Studio

`npm run db:studio` (puerto 5000)

## ⚠️ Crítico

**Amounts**: Siempre `integer` en milliunits (×1000). Ver `lib/utils.ts` para conversión.  
**Balances**: NUNCA mutar en código - triggers DB automáticos.

Referencia completa: Ver `database-schema.md`
