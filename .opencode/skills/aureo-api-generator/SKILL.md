# Aureo API Generator

Genera endpoints API completos siguiendo los patrones de Aureo Finance Platform.

## Cuándo Usar

- Crear nuevo endpoint REST API (GET, POST, PATCH, DELETE)
- Añadir operaciones CRUD a una feature existente
- Generar bulk operations

## Patrón de Generación

### Input Esperado

```
Resource name: accounts
Operations: GET (list), GET (single), POST, PATCH, DELETE, bulk-delete
Schema: insertAccountSchema
User-owned: yes
```

### Output Generado

#### 1. API Endpoint File

```typescript
// app/api/[[...route]]/[resource].ts
import { Hono } from "hono";
import { clerkMiddleware, getAuth } from "@hono/clerk-auth";
import { zValidator } from "@hono/zod-validator";
import { createId } from "@paralleldrive/cuid2";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db/drizzle";
import { [resource], insert[Resource]Schema } from "@/db/schema";

const app = new Hono()
  .get("/", clerkMiddleware(), async (ctx) => {
    const auth = getAuth(ctx);
    if (!auth?.userId) {
      return ctx.json({ error: "Unauthorized" }, 401);
    }

    const data = await db
      .select({
        id: [resource].id,
        name: [resource].name,
      })
      .from([resource])
      .where(eq([resource].userId, auth.userId));

    return ctx.json({ data });
  })
  .get(
    "/:id",
    zValidator("param", z.object({ id: z.string().optional() })),
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
        .from([resource])
        .where(
          and(
            eq([resource].id, id),
            eq([resource].userId, auth.userId)
          )
        );

      if (!data) {
        return ctx.json({ error: "Not found" }, 404);
      }

      return ctx.json({ data });
    }
  )
  .post(
    "/",
    clerkMiddleware(),
    zValidator("json", insert[Resource]Schema.pick({ name: true })),
    async (ctx) => {
      const auth = getAuth(ctx);
      if (!auth?.userId) {
        return ctx.json({ error: "Unauthorized" }, 401);
      }

      const values = ctx.req.valid("json");

      const [data] = await db
        .insert([resource])
        .values({
          id: createId(),
          userId: auth.userId,
          ...values,
        })
        .returning();

      return ctx.json({ data });
    }
  )
  .patch(
    "/:id",
    clerkMiddleware(),
    zValidator("param", z.object({ id: z.string().optional() })),
    zValidator("json", insert[Resource]Schema.pick({ name: true })),
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
        .update([resource])
        .set(values)
        .where(
          and(
            eq([resource].id, id),
            eq([resource].userId, auth.userId)
          )
        )
        .returning();

      if (!data) {
        return ctx.json({ error: "Not found" }, 404);
      }

      return ctx.json({ data });
    }
  )
  .delete(
    "/:id",
    clerkMiddleware(),
    zValidator("param", z.object({ id: z.string().optional() })),
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
        .delete([resource])
        .where(
          and(
            eq([resource].id, id),
            eq([resource].userId, auth.userId)
          )
        )
        .returning({ id: [resource].id });

      if (!data) {
        return ctx.json({ error: "Not found" }, 404);
      }

      return ctx.json({ data });
    }
  )
  .post(
    "/bulk-delete",
    clerkMiddleware(),
    zValidator("json", z.object({ ids: z.array(z.string()) })),
    async (ctx) => {
      const auth = getAuth(ctx);
      if (!auth?.userId) {
        return ctx.json({ error: "Unauthorized" }, 401);
      }

      const values = ctx.req.valid("json");

      const data = await db
        .delete([resource])
        .where(
          and(
            inArray([resource].id, values.ids),
            eq([resource].userId, auth.userId)
          )
        )
        .returning({ id: [resource].id });

      return ctx.json({ data });
    }
  );

export default app;
```

#### 2. React Query Hooks

**use-get-[resource]s.ts**:

```typescript
import { useQuery } from "@tanstack/react-query";

import { client } from "@/lib/hono";

export const useGet[Resource]s = () => {
  const query = useQuery({
    queryKey: ["[resource]s"],
    queryFn: async () => {
      const response = await client.api.[resource]s.$get();

      if (!response.ok) {
        throw new Error("Failed to fetch [resource]s");
      }

      const { data } = await response.json();
      return data;
    },
  });

  return query;
};
```

**use-create-[resource].ts**:

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

import { client } from "@/lib/hono";

type ResponseType = InferResponseType<typeof client.api.[resource]s.$post>;
type RequestType = InferRequestType<typeof client.api.[resource]s.$post>["json"];

export const useCreate[Resource] = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (json) => {
      const response = await client.api.[resource]s.$post({ json });
      return await response.json();
    },
    onSuccess: () => {
      toast.success("[Resource] created");
      queryClient.invalidateQueries({ queryKey: ["[resource]s"] });
    },
    onError: () => {
      toast.error("Failed to create [resource]");
    },
  });

  return mutation;
};
```

(Similar para edit, delete, bulk-delete)

## Customizations

### Non-User-Owned Resources

Si el recurso NO tiene `userId`, ajusta auth:

```typescript
// Auth via related table
.innerJoin(accounts, eq([resource].accountId, accounts.id))
.where(eq(accounts.userId, auth.userId))
```

### Custom Validations

```typescript
zValidator(
  "query",
  z.object({
    type: z.enum(["Income", "Expense"]).default("Expense"),
    from: z.string().optional(),
    to: z.string().optional(),
  }),
);
```

### With Joins

```typescript
const data = await db
  .select({
    id: [resource].id,
    name: [resource].name,
    parentName: parent[Resource].name,
  })
  .from([resource])
  .leftJoin(parent[Resource], eq([resource].parentId, parent[Resource].id))
  .where(eq([resource].userId, auth.userId));
```

## Checklist

- [ ] Endpoint en `app/api/[[...route]]/[resource].ts`
- [ ] Import en `app/api/[[...route]]/route.ts`
- [ ] Hooks en `features/[resource]/api/`
- [ ] 100% Zod validation
- [ ] Defense-in-depth auth (4 capas)
- [ ] Row-level security
- [ ] Select específico (no `SELECT *`)
- [ ] Error handling (400, 401, 404)
- [ ] Toast notifications
- [ ] Query invalidation correcta
