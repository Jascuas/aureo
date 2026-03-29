# Arquitectura del Proyecto Aureo

## Feature-Based Architecture

El proyecto sigue una arquitectura basada en features para escalabilidad y mantenibilidad.

### Estructura de Directorios

```
/features/
  ├── accounts/
  │   ├── api/          # React Query hooks
  │   │   ├── use-get-accounts.ts
  │   │   ├── use-create-account.ts
  │   │   ├── use-edit-account.ts
  │   │   └── use-delete-account.ts
  │   ├── components/   # Feature-specific UI
  │   │   ├── account-form.tsx
  │   │   ├── new-account-sheet.tsx
  │   │   └── edit-account-sheet.tsx
  │   └── hooks/        # Feature state (Zustand)
  │       ├── use-new-account.ts
  │       └── use-open-account.ts
  ├── categories/
  │   ├── api/
  │   ├── components/
  │   └── hooks/
  ├── transactions/
  │   ├── api/
  │   ├── components/
  │   └── hooks/
  └── summary/
      └── api/
```

---

## Reglas de Organización

### `features/{domain}/`

**Propósito**: Lógica de negocio específica por dominio

**Contenido**:

- `api/`: React Query hooks (use-get-_, use-create-_, etc.)
- `components/`: UI específica del feature
- `hooks/`: Estado local del feature (Zustand stores)

**Ejemplo**:

```typescript
// features/accounts/api/use-create-account.ts
export const useCreateAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (json) => {...},
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    }
  });
};
```

### `components/` (raíz)

**Propósito**: Componentes compartidos y reutilizables

**Contenido**:

- Visualización de datos: `chart.tsx`, `data-card.tsx`, `pie-variant.tsx`
- Filtros: `account-filter.tsx`, `date-filter.tsx`
- Layout: `header.tsx`, `navigation.tsx`

**NO incluir**: Lógica específica de un feature

### `components/ui/`

**Propósito**: Primitivas de shadcn/ui

**Contenido**: Button, Dialog, Sheet, Form, Input, etc.

### `hooks/` (raíz)

**Propósito**: Hooks utilitarios globales

**Contenido**:

- `use-confirm.tsx`: Hook de confirmación
- `use-chart-controls.ts`: Control de charts

### `lib/`

**Propósito**: Utilidades, tipos, constantes

**Contenido**:

- `utils.ts`: Funciones helper (cn, convertAmount, etc.)
- `types.ts`: Tipos compartidos globales
- `constants.ts`: Constantes de la app
- `hono.ts`: Cliente tipado de API

### `app/`

**Propósito**: Next.js App Router

**Contenido**:

- `(auth)/`: Rutas de autenticación
- `(dashboard)/`: Rutas protegidas
- `api/[[...route]]/`: Endpoints de Hono.js

---

## Flujo de Datos

### Feature → API → Database

```
User Action (UI)
  ↓
Component (features/*/components/)
  ↓
React Query Hook (features/*/api/)
  ↓
Hono API Endpoint (app/api/[[...route]]/)
  ↓
Drizzle ORM Query (db/drizzle.ts)
  ↓
PostgreSQL Database
```

### Estado de UI

```
User Opens Modal
  ↓
Zustand Store (features/*/hooks/)
  ↓
Component Re-renders
```

---

## Patrones de Código

### Crear Nuevo Feature

1. **Crear estructura**:

```bash
features/
  └── new-feature/
      ├── api/
      ├── components/
      └── hooks/
```

2. **API Hooks** (React Query):

```typescript
// features/new-feature/api/use-get-items.ts
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

3. **UI State** (Zustand):

```typescript
// features/new-feature/hooks/use-new-item.ts
export const useNewItem = create<NewItemState>((set) => ({
  isOpen: false,
  onOpen: () => set({ isOpen: true }),
  onClose: () => set({ isOpen: false }),
}));
```

4. **Componente**:

```typescript
// features/new-feature/components/new-item-sheet.tsx
export const NewItemSheet = () => {
  const { isOpen, onClose } = useNewItem();
  const mutation = useCreateItem();

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      {/* Form */}
    </Sheet>
  );
};
```

5. **API Endpoint**:

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

---

## Naming Patterns

### Archivos

- Components: `new-account-sheet.tsx`, `account-form.tsx`
- Hooks: `use-new-account.ts`, `use-open-account.ts`
- API: `use-get-accounts.ts`, `use-create-account.ts`

### Funciones

- React Query: `useGetAccounts`, `useCreateAccount`
- Zustand: `useNewAccount`, `useOpenAccount`
- Mutations: `useCreateX`, `useEditX`, `useDeleteX`, `useBulkDeleteX`

### Query Keys

```typescript
["accounts"][("account", { id })]["transactions"][("transaction", { id })][ // Lista // Individual
  "summary"
][("overview", { from, to, accountId })];
```
