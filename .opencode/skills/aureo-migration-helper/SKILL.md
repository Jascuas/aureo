# Aureo Migration Helper

Migrations with Drizzle ORM.

## When to Use This Skill

✅ **USE when**:

- Creating new table in PostgreSQL with Drizzle ORM
- Adding/modifying columns in existing table
- Creating relations between tables (one-to-one, one-to-many, many-to-many)
- Adding constraints (FK, unique, not null, onDelete behaviors)
- Implementing self-referencing tables (hierarchies)
- Need workflow guidance: schema → generate → review → migrate → zod

❌ **DON'T USE when**:

- Only querying DB without schema changes → use Drizzle query directly
- Simple modification (1 field) → do it directly without skill
- Seed data or population scripts → write script directly

## Workflow

1. **Modify schema**: `db/schema.ts`
2. **Generate migration**: `npm run db:generate` → creates `drizzle/XXXX.sql`
3. **Review SQL**: verify generated changes
4. **Execute**: `npm run db:migrate`
5. **Zod schema**: `createInsertSchema(table)`

## Patterns

**New table**:

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

**Junction table**: Two FKs + relations with `relationName`

**Add column**: Just add field in schema → `db:generate` creates `ALTER TABLE`

## onDelete

`cascade` (delete related) | `set null` | `restrict` (prevent) | `no action` (default)

## Types

`text | integer | real | boolean | timestamp | json | jsonb`

## Modifiers

`.notNull() | .primaryKey() | .unique() | .default(val) | .defaultNow() | .references()`

## Drizzle Studio

`npm run db:studio` (port 5000)

## ⚠️ Critical

**Amounts**: Always `integer` in milliunits (×1000). See `lib/utils.ts` for conversion.  
**Balances**: NEVER mutate in code - automatic DB triggers.

Complete reference: See `database-schema.md`
