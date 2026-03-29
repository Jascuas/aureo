# Aureo API Generator

Genera endpoints API CRUD con Hono.js siguiendo patterns de Aureo.

## Cuándo Usar Este Skill

✅ **USA cuando**:

- Crear nuevo recurso API con operaciones CRUD (GET list/single, POST, PATCH, DELETE)
- Añadir bulk-delete a recurso existente
- Generar endpoint que requiere autenticación con Clerk (user-owned resources)
- Implementar validación con Zod en endpoints
- Crear API que sigue pattern: Hono + clerkMiddleware + zValidator + Drizzle

❌ **NO USES cuando**:

- Solo necesitas un endpoint (no CRUD completo) → escribe directo sin skill
- API pública sin autenticación → este skill asume Clerk auth
- Lógica de negocio compleja más allá de CRUD → implementa manualmente

## Output

### 1. API Endpoint

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
  .get("/", /* list pattern */)
  .get("/:id", /* single pattern */)
  .post("/", /* create pattern */)
  .patch("/:id", /* update pattern */)
  .delete("/:id", /* delete pattern */)
  .post("/bulk-delete", /* bulk pattern */);

export default app;
```

Ver patterns completos en `.opencode/docs/api-patterns.md`

### 2. React Query Hooks

```typescript
// features/[resource]/api/
export const useGet[Resource]s = () => useQuery({ queryKey: ["[resource]s"], ... });
export const useGet[Resource] = (id) => useQuery({ enabled: !!id, queryKey: ["[resource]", { id }], ... });
export const useCreate[Resource] = () => useMutation({ onSuccess: invalidate["[resource]s"], ... });
export const useEdit[Resource] = (id) => useMutation({ onSuccess: invalidate all related, ... });
export const useDelete[Resource] = (id) => useMutation({ ... });
export const useBulkDelete[Resource]s = () => useMutation({ ... });
```

Ver patterns completos en `.opencode/docs/state-management.md`

## Customizations

### Non-User-Owned (auth via JOIN)

```typescript
.innerJoin(accounts, eq([resource].accountId, accounts.id))
.where(eq(accounts.userId, auth.userId))
```

### Custom Validation

```typescript
zValidator(
  "query",
  z.object({
    type: z.enum(["Income", "Expense"]).default("Expense"),
    from: z.string().optional(),
  }),
);
```

### With Joins

```typescript
.select({
  id: [resource].id,
  parentName: parent[Resource].name,
})
.leftJoin(parent[Resource], eq([resource].parentId, parent[Resource].id))
```

## Checklist

- [ ] Endpoint en `app/api/[[...route]]/[resource].ts`
- [ ] Import en `route.ts`: `.route("/[resource]s", [resource])`
- [ ] Hooks en `features/[resource]/api/`
- [ ] 100% Zod validation
- [ ] Auth 4 capas (ver api-patterns.md)
- [ ] Select específico
- [ ] Error handling (400, 401, 404)
- [ ] Toast notifications
- [ ] Invalidation correcta
