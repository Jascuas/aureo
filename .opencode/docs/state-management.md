# State Management - Aureo Finance Platform

Zustand para UI state + React Query para server state.

---

## Zustand (UI State)

### Propósito

Gestionar SOLO estado de UI (modales open/close).

### Patrón "New Entity"

```typescript
// features/accounts/hooks/use-new-account.ts
import { create } from "zustand";

type NewAccountState = {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
};

export const useNewAccount = create<NewAccountState>((set) => ({
  isOpen: false,
  onOpen: () => set({ isOpen: true }),
  onClose: () => set({ isOpen: false }),
}));
```

**Uso**:

```typescript
const { isOpen, onOpen, onClose } = useNewAccount();

<Button onClick={onOpen}>New Account</Button>

<Sheet open={isOpen} onOpenChange={onClose}>
  {/* Form */}
</Sheet>
```

### Patrón "Edit Entity" (con ID)

```typescript
// features/accounts/hooks/use-open-account.ts
import { create } from "zustand";

type OpenAccountState = {
  id?: string;
  isOpen: boolean;
  onOpen: (id: string) => void;
  onClose: () => void;
};

export const useOpenAccount = create<OpenAccountState>((set) => ({
  id: undefined,
  isOpen: false,
  onOpen: (id: string) => set({ isOpen: true, id }),
  onClose: () => set({ isOpen: false, id: undefined }),
}));
```

**Uso**:

```typescript
const { id, isOpen, onOpen, onClose } = useOpenAccount();

<Button onClick={() => onOpen(accountId)}>Edit</Button>

<Sheet open={isOpen} onOpenChange={onClose}>
  <EditAccountSheet id={id} />
</Sheet>
```

### Stores Existentes

```
features/accounts/hooks/
  ├── use-new-account.ts      # Crear cuenta
  └── use-open-account.ts     # Editar cuenta

features/categories/hooks/
  ├── use-new-category.ts     # Crear categoría
  └── use-open-category.ts    # Editar categoría

features/transactions/hooks/
  ├── use-new-transaction.ts  # Crear transacción
  └── use-open-transaction.ts # Editar transacción
```

---

## React Query (Server State)

### Configuración

```typescript
// providers/query-provider.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 60 segundos
    },
  },
});
```

**Stale Time**: 60s → data fresh por 1 minuto, no refetch

**Defaults**:

- `refetchOnWindowFocus: true`
- `refetchOnReconnect: true`
- `retry: 3`
- `cacheTime: 5 minutes`

---

## Query Keys

### Convención

```typescript
// Lista de recursos
["accounts"]["categories"]["transactions"][
  // Recurso individual
  ("account", { id: "abc123" })
][("category", { id: "xyz789" })][("transaction", { id: "def456" })][
  // Queries complejas
  "summary"
][("overview", { from: "2024-01-01", to: "2024-12-31", accountId: "abc" })];
```

---

## Queries

### Pattern: GET (List)

```typescript
// features/accounts/api/use-get-accounts.ts
import { useQuery } from "@tanstack/react-query";
import { client } from "@/lib/hono";

export const useGetAccounts = () => {
  const query = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const response = await client.api.accounts.$get();

      if (!response.ok) {
        throw new Error("Failed to fetch accounts");
      }

      const { data } = await response.json();
      return data;
    },
  });

  return query;
};
```

**Uso**:

```typescript
const { data, isLoading, error } = useGetAccounts();

if (isLoading) return <Skeleton />;
if (error) return <Error />;

return <AccountsList accounts={data} />;
```

### Pattern: GET (Single)

```typescript
// features/accounts/api/use-get-account.ts
export const useGetAccount = (id?: string) => {
  const query = useQuery({
    enabled: !!id, // Solo ejecuta si hay ID
    queryKey: ["account", { id }],
    queryFn: async () => {
      const response = await client.api.accounts[":id"].$get({
        param: { id },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch account");
      }

      const { data } = await response.json();
      return data;
    },
  });

  return query;
};
```

---

## Mutations

### Pattern: CREATE

```typescript
// features/accounts/api/use-create-account.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { InferRequestType, InferResponseType } from "hono";
import { client } from "@/lib/hono";

type ResponseType = InferResponseType<typeof client.api.accounts.$post>;
type RequestType = InferRequestType<typeof client.api.accounts.$post>["json"];

export const useCreateAccount = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (json) => {
      const response = await client.api.accounts.$post({ json });
      return await response.json();
    },
    onSuccess: () => {
      toast.success("Account created");
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
    onError: () => {
      toast.error("Failed to create account");
    },
  });

  return mutation;
};
```

**Uso**:

```typescript
const mutation = useCreateAccount();

const onSubmit = (values: FormValues) => {
  mutation.mutate(values, {
    onSuccess: () => {
      onClose();
    },
  });
};
```

### Pattern: UPDATE

```typescript
// features/accounts/api/use-edit-account.ts
type ResponseType = InferResponseType<
  (typeof client.api.accounts)[":id"]["$patch"]
>;
type RequestType = InferRequestType<
  (typeof client.api.accounts)[":id"]["$patch"]
>["json"];

export const useEditAccount = (id?: string) => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (json) => {
      const response = await client.api.accounts[":id"].$patch({
        param: { id },
        json,
      });
      return await response.json();
    },
    onSuccess: () => {
      toast.success("Account updated");
      queryClient.invalidateQueries({ queryKey: ["account", { id }] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["summary"] });
    },
    onError: () => {
      toast.error("Failed to update account");
    },
  });

  return mutation;
};
```

### Pattern: DELETE

```typescript
// features/accounts/api/use-delete-account.ts
type ResponseType = InferResponseType<
  (typeof client.api.accounts)[":id"]["$delete"]
>;

export const useDeleteAccount = (id?: string) => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error>({
    mutationFn: async () => {
      const response = await client.api.accounts[":id"].$delete({
        param: { id },
      });
      return await response.json();
    },
    onSuccess: () => {
      toast.success("Account deleted");
      queryClient.invalidateQueries({ queryKey: ["account", { id }] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["summary"] });
    },
    onError: () => {
      toast.error("Failed to delete account");
    },
  });

  return mutation;
};
```

---

## Invalidation Strategy

### Reglas de Invalidación

**Crear/Editar/Borrar Account**:

```typescript
queryClient.invalidateQueries({ queryKey: ["accounts"] });
queryClient.invalidateQueries({ queryKey: ["transactions"] });
queryClient.invalidateQueries({ queryKey: ["summary"] });
```

**Crear/Editar/Borrar Transaction**:

```typescript
queryClient.invalidateQueries({ queryKey: ["transactions"] });
queryClient.invalidateQueries({ queryKey: ["summary"] });
```

**Crear/Editar/Borrar Category**:

```typescript
queryClient.invalidateQueries({ queryKey: ["categories"] });
queryClient.invalidateQueries({ queryKey: ["transactions"] });
queryClient.invalidateQueries({ queryKey: ["summary"] });
```

### NO Optimistic Updates

⚠️ **Este proyecto NO usa optimistic updates**.

Estrategia: **Invalidation-only**

- Mutation ejecuta
- `onSuccess`: invalida queries
- React Query refetch automático
- UI actualiza con data del servidor

---

## Type Safety

### Inferir tipos de Hono

```typescript
import { InferRequestType, InferResponseType } from "hono";
import { client } from "@/lib/hono";

// Response type
type ResponseType = InferResponseType<typeof client.api.accounts.$post>;

// Request type
type RequestType = InferRequestType<typeof client.api.accounts.$post>["json"];

// Usage en mutation
const mutation = useMutation<ResponseType, Error, RequestType>({...});
```
