# API Patterns - Aureo Finance Platform

Hono.js + Zod + Clerk authentication patterns.

---

## Estructura de API

### Main Router

```typescript
// app/api/[[...route]]/route.ts
import { Hono } from "hono";
import { handle } from "hono/vercel";

export const runtime = "edge";

const app = new Hono()
  .basePath("/api")
  .route("/accounts", accounts)
  .route("/categories", categories)
  .route("/transactions", transactions)
  .route("/summary", summary);

export const GET = handle(app);
export const POST = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);

export type AppType = typeof app;
```

**Key Points**:

- Edge runtime para performance
- Base path `/api`
- Type export para cliente tipado
- Handle solo métodos necesarios

---

## Cliente Tipado (RPC)

```typescript
// lib/hono.ts
import { hc } from "hono/client";
import { AppType } from "@/app/api/[[...route]]/route";

export const client = hc<AppType>(process.env.NEXT_PUBLIC_APP_URL!);
```

**Uso**:

```typescript
// End-to-end type safety
const response = await client.api.accounts.$get();
const { data } = await response.json(); // Type-safe!
```

---

## Patrón de Endpoint Estándar

### GET (List)

```typescript
.get(
  "/",
  clerkMiddleware(),
  async (ctx) => {
    const auth = getAuth(ctx);
    if (!auth?.userId) {
      return ctx.json({ error: "Unauthorized" }, 401);
    }

    const data = await db
      .select()
      .from(accounts)
      .where(eq(accounts.userId, auth.userId));

    return ctx.json({ data });
  }
)
```

### GET (With Query Params)

```typescript
.get(
  "/",
  zValidator(
    "query",
    z.object({
      from: z.string().optional(),
      to: z.string().optional(),
      accountId: z.string().optional(),
    })
  ),
  clerkMiddleware(),
  async (ctx) => {
    const auth = getAuth(ctx);
    if (!auth?.userId) {
      return ctx.json({ error: "Unauthorized" }, 401);
    }

    const { from, to, accountId } = ctx.req.valid("query");
    // Use params...
  }
)
```

### GET (By ID)

```typescript
.get(
  "/:id",
  zValidator(
    "param",
    z.object({
      id: z.string().optional(),
    })
  ),
  clerkMiddleware(),
  async (ctx) => {
    const auth = getAuth(ctx);
    if (!auth?.userId) {
      return ctx.json({ error: "Unauthorized" }, 401);
    }

    const { id } = ctx.req.valid("param");
    if (!id) {
      return ctx.json({ error: "Missing id" }, 400);
    }

    const [data] = await db
      .select()
      .from(accounts)
      .where(
        and(
          eq(accounts.id, id),
          eq(accounts.userId, auth.userId)
        )
      );

    if (!data) {
      return ctx.json({ error: "Not found" }, 404);
    }

    return ctx.json({ data });
  }
)
```

### POST (Create)

```typescript
.post(
  "/",
  clerkMiddleware(),
  zValidator(
    "json",
    insertAccountSchema.pick({
      name: true,
    })
  ),
  async (ctx) => {
    const auth = getAuth(ctx);
    if (!auth?.userId) {
      return ctx.json({ error: "Unauthorized" }, 401);
    }

    const values = ctx.req.valid("json");

    const [data] = await db
      .insert(accounts)
      .values({
        id: createId(),
        userId: auth.userId,
        ...values,
      })
      .returning();

    return ctx.json({ data });
  }
)
```

### PATCH (Update)

```typescript
.patch(
  "/:id",
  clerkMiddleware(),
  zValidator(
    "param",
    z.object({
      id: z.string().optional(),
    })
  ),
  zValidator(
    "json",
    insertAccountSchema.pick({
      name: true,
    })
  ),
  async (ctx) => {
    const auth = getAuth(ctx);
    if (!auth?.userId) {
      return ctx.json({ error: "Unauthorized" }, 401);
    }

    const { id } = ctx.req.valid("param");
    if (!id) {
      return ctx.json({ error: "Missing id" }, 400);
    }

    const values = ctx.req.valid("json");

    const [data] = await db
      .update(accounts)
      .set(values)
      .where(
        and(
          eq(accounts.id, id),
          eq(accounts.userId, auth.userId)
        )
      )
      .returning();

    if (!data) {
      return ctx.json({ error: "Not found" }, 404);
    }

    return ctx.json({ data });
  }
)
```

### DELETE

```typescript
.delete(
  "/:id",
  clerkMiddleware(),
  zValidator(
    "param",
    z.object({
      id: z.string().optional(),
    })
  ),
  async (ctx) => {
    const auth = getAuth(ctx);
    if (!auth?.userId) {
      return ctx.json({ error: "Unauthorized" }, 401);
    }

    const { id } = ctx.req.valid("param");
    if (!id) {
      return ctx.json({ error: "Missing id" }, 400);
    }

    const [data] = await db
      .delete(accounts)
      .where(
        and(
          eq(accounts.id, id),
          eq(accounts.userId, auth.userId)
        )
      )
      .returning({ id: accounts.id });

    if (!data) {
      return ctx.json({ error: "Not found" }, 404);
    }

    return ctx.json({ data });
  }
)
```

### POST (Bulk Delete)

```typescript
.post(
  "/bulk-delete",
  clerkMiddleware(),
  zValidator(
    "json",
    z.object({
      ids: z.array(z.string()),
    })
  ),
  async (ctx) => {
    const auth = getAuth(ctx);
    if (!auth?.userId) {
      return ctx.json({ error: "Unauthorized" }, 401);
    }

    const values = ctx.req.valid("json");

    const data = await db
      .delete(accounts)
      .where(
        and(
          inArray(accounts.id, values.ids),
          eq(accounts.userId, auth.userId)
        )
      )
      .returning({ id: accounts.id });

    return ctx.json({ data });
  }
)
```

---

## Validación con Zod

### Tipos de Validación

#### 1. Query Parameters

```typescript
zValidator(
  "query",
  z.object({
    from: z.string().optional(),
    to: z.string().optional(),
  }),
);
```

#### 2. Route Parameters

```typescript
zValidator(
  "param",
  z.object({
    id: z.string().optional(),
  }),
);
```

#### 3. JSON Body

```typescript
zValidator("json", insertAccountSchema.pick({ name: true }));
```

#### 4. Arrays

```typescript
zValidator("json", z.array(insertTransactionSchema.omit({ id: true })));
```

#### 5. Enums y Coercion

```typescript
zValidator(
  "query",
  z.object({
    type: z.enum(["Income", "Expense", "Refund"]).default("Expense"),
    top: z.coerce.number().int().positive().max(20).default(3),
  }),
);
```

---

## Autenticación (Clerk)

### Defense-in-Depth (4 capas)

#### 1. Global Middleware (middleware.ts)

```typescript
export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) await auth.protect();
});
```

#### 2. Route-Level Middleware

```typescript
.get("/", clerkMiddleware(), async (ctx) => { ... })
```

#### 3. Explicit Auth Check

```typescript
const auth = getAuth(ctx);
if (!auth?.userId) {
  return ctx.json({ error: "Unauthorized" }, 401);
}
```

#### 4. Row-Level Security

```typescript
.where(eq(accounts.userId, auth.userId))
```

### Auth Pattern para Transacciones

Transacciones NO tienen `userId` directo → auth via JOIN:

```typescript
const [data] = await db
  .select()
  .from(transactions)
  .innerJoin(accounts, eq(transactions.accountId, accounts.id))
  .where(and(eq(transactions.id, id), eq(accounts.userId, auth.userId)));
```

---

## Error Handling

### Respuestas Estándar

```typescript
// 400 Bad Request
return ctx.json({ error: "Missing id" }, 400);

// 401 Unauthorized
return ctx.json({ error: "Unauthorized" }, 401);

// 404 Not Found
return ctx.json({ error: "Not found" }, 404);

// 200 Success
return ctx.json({ data });
```

---

## Performance Patterns

### Select Específico

```typescript
// ❌ Evitar select *
const data = await db.select().from(accounts);

// ✅ Select solo lo necesario
const data = await db
  .select({
    id: accounts.id,
    name: accounts.name,
  })
  .from(accounts);
```

### Joins Optimizados

```typescript
// LEFT JOIN para datos opcionales
.leftJoin(parentCategory, eq(categories.parentId, parentCategory.id))

// INNER JOIN para datos requeridos
.innerJoin(accounts, eq(transactions.accountId, accounts.id))
```
