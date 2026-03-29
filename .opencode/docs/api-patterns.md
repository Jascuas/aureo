# API Patterns - Aureo

Hono.js + Zod + Clerk patterns.

## Setup

```typescript
// app/api/[[...route]]/route.ts
export const runtime = "edge";
const app = new Hono().basePath("/api").route("/accounts", accounts);
export type AppType = typeof app;

// lib/hono.ts
export const client = hc<AppType>(process.env.NEXT_PUBLIC_APP_URL!);
```

## Endpoint Pattern

```typescript
.get("/", clerkMiddleware(), async (ctx) => {
  const auth = getAuth(ctx);
  if (!auth?.userId) return ctx.json({ error: "Unauthorized" }, 401);

  const data = await db.select().from(table).where(eq(table.userId, auth.userId));
  return ctx.json({ data });
})

.get("/:id", zValidator("param", z.object({ id: z.string().optional() })),
  clerkMiddleware(), async (ctx) => {
    const { id } = ctx.req.valid("param");
    if (!id) return ctx.json({ error: "Missing id" }, 400);
    // Auth via userId + not found check
})

.post("/", clerkMiddleware(),
  zValidator("json", insertSchema.pick({ name: true })),
  async (ctx) => {
    const values = ctx.req.valid("json");
    const [data] = await db.insert(table).values({
      id: createId(),
      userId: auth.userId,
      ...values,
    }).returning();
    return ctx.json({ data });
})

.patch("/:id", clerkMiddleware(),
  zValidator("param", z.object({ id: z.string().optional() })),
  zValidator("json", insertSchema.pick({ name: true })),
  async (ctx) => {
    const [data] = await db.update(table).set(values)
      .where(and(eq(table.id, id), eq(table.userId, auth.userId)))
      .returning();
    if (!data) return ctx.json({ error: "Not found" }, 404);
})

.delete("/:id", /* similar */)

.post("/bulk-delete",
  zValidator("json", z.object({ ids: z.array(z.string()) })),
  async (ctx) => {
    await db.delete(table).where(and(
      inArray(table.id, values.ids),
      eq(table.userId, auth.userId)
    ));
})
```

## Validación Zod

```typescript
// Query params
zValidator("query", z.object({ from: z.string().optional() }));

// Route params
zValidator("param", z.object({ id: z.string().optional() }));

// Body
zValidator("json", insertSchema.pick({ name: true }));

// Arrays
zValidator("json", z.array(insertSchema.omit({ id: true })));

// Enums + coercion
z.object({
  type: z.enum(["Income", "Expense"]).default("Expense"),
  top: z.coerce.number().int().positive().max(20).default(3),
});
```

## Auth (4 capas)

1. **Global middleware** (middleware.ts)
2. **Route middleware** (clerkMiddleware())
3. **Explicit check** (if !auth?.userId)
4. **Row-level** (.where(eq(table.userId, auth.userId)))

### Auth para recursos sin userId directo

```typescript
// Via JOIN
.innerJoin(accounts, eq(transactions.accountId, accounts.id))
.where(eq(accounts.userId, auth.userId))
```

## Performance

```typescript
// ❌ SELECT *
const data = await db.select().from(accounts);

// ✅ Select específico
const data = await db.select({ id: accounts.id, name: accounts.name });
```
