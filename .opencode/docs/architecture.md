# Arquitectura - Aureo

Feature-based architecture.

## Estructura

```
/features/{domain}/
  ├── api/          # React Query hooks (use-get-*, use-create-*)
  ├── components/   # Feature UI (form, sheets)
  └── hooks/        # Feature state (Zustand)

/components/        # Shared UI (charts, filters, layout)
/components/ui/     # shadcn primitives
/hooks/             # Global utils (use-confirm, use-chart-controls)
/lib/               # Utils (utils.ts, types.ts, hono.ts)
/app/
  ├── (auth)/       # Public routes
  ├── (dashboard)/  # Protected routes
  └── api/[[...route]]/  # Hono endpoints
```

## Flujo de Datos

```
User Action → Component → React Query Hook → Hono API → Drizzle → PostgreSQL
Modal State → Zustand Store → Component Re-render
```

## Crear Feature

1. **Estructura**

```bash
features/items/
  ├── api/
  │   ├── use-get-items.ts
  │   └── use-create-item.ts
  ├── components/
  │   ├── item-form.tsx
  │   └── new-item-sheet.tsx
  └── hooks/
      └── use-new-item.ts
```

2. **API Hook**

```typescript
export const useGetItems = () => {
  return useQuery({
    queryKey: ["items"],
    queryFn: async () => {
      const response = await client.api.items.$get();
      const { data } = await response.json();
      return data;
    },
  });
};
```

3. **Zustand Store**

```typescript
export const useNewItem = create<State>((set) => ({
  isOpen: false,
  onOpen: () => set({ isOpen: true }),
  onClose: () => set({ isOpen: false }),
}));
```

4. **Component**

```typescript
export const NewItemSheet = () => {
  const { isOpen, onClose } = useNewItem();
  const mutation = useCreateItem();

  return <Sheet open={isOpen} onOpenChange={onClose}>{/* Form */}</Sheet>;
};
```

5. **API Endpoint**

```typescript
// app/api/[[...route]]/items.ts
export default new Hono().get("/", clerkMiddleware(), async (ctx) => {
  const auth = getAuth(ctx);
  if (!auth?.userId) return ctx.json({ error: "Unauthorized" }, 401);
  const data = await db
    .select()
    .from(items)
    .where(eq(items.userId, auth.userId));
  return ctx.json({ data });
});
```

## Naming

- Files: `kebab-case` (new-account-sheet.tsx, use-get-accounts.ts)
- Hooks: `useGetAccounts`, `useCreateAccount`, `useNewAccount`
- Query keys: `["accounts"]`, `["account", { id }]`
