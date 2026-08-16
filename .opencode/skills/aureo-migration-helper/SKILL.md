# Aureo Migration Helper

Compatibility checklist for Drizzle migrations. `AGENTS.md` is authoritative;
this skill never authorizes applying a migration or changing production data.

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
- A schema change is not approved or lacks a data/rollback plan
- Seed data or population scripts → write script directly

## Workflow

1. **Plan data behavior**: existing rows, invariants, rollback, and verification.
2. **Modify schema**: `db/schema.ts`.
3. **Generate migration**: `pnpm db:generate`.
4. **Review SQL and journal**: verify generated files and Drizzle metadata.
5. **Stop for approval**: never run `pnpm db:migrate`, `pnpm db:up`, or another
   configured database mutation without explicit user authorization.
6. **Verify separately**: generated, journaled, applied, and live behavior are
   distinct facts.

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

`pnpm db:studio` uses configured infrastructure and requires target awareness.

## ⚠️ Critical

**Amounts**: Preserve the approved integer-milliunit contract and conversion
helpers. **Balances**: the current sign conflict is unresolved; do not change
the trigger, stored signs, or existing balances without the approved plan
required by `AGENTS.md`.
