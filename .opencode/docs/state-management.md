# State Management - Aureo

Zustand (UI) + React Query (server).

## Zustand (UI State)

Only for modal open/close.

### Pattern: New Entity

```typescript
// features/accounts/hooks/use-new-account.ts
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

### Pattern: Edit Entity

```typescript
// features/accounts/hooks/use-open-account.ts
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

## React Query

### Config

```typescript
// providers/query-provider.tsx
new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60 * 1000 }, // 60s
  },
});
```

### Query Keys

```typescript
["accounts"][("account", { id })][("transactions", { from, to })]["summary"]; // List // Single // With params
```

### Pattern: Query

```typescript
// features/accounts/api/use-get-accounts.ts
export const useGetAccounts = () => {
  return useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const response = await client.api.accounts.$get();
      if (!response.ok) throw new Error("Failed to fetch");
      const { data } = await response.json();
      return data;
    },
  });
};

// With ID (conditional)
export const useGetAccount = (id?: string) => {
  return useQuery({
    enabled: !!id,
    queryKey: ["account", { id }],
    queryFn: async () => {
      const response = await client.api.accounts[":id"].$get({ param: { id } });
      // ...
    },
  });
};
```

### Pattern: Mutation

```typescript
// features/accounts/api/use-create-account.ts
type ResponseType = InferResponseType<typeof client.api.accounts.$post>;
type RequestType = InferRequestType<typeof client.api.accounts.$post>["json"];

export const useCreateAccount = () => {
  const queryClient = useQueryClient();

  return useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (json) => {
      const response = await client.api.accounts.$post({ json });
      return await response.json();
    },
    onSuccess: () => {
      toast.success("Account created");
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
    onError: () => toast.error("Failed to create"),
  });
};
```

Similar for: `useEditAccount(id)`, `useDeleteAccount(id)`, `useBulkDelete`

## Invalidation Strategy

**NO optimistic updates** - only invalidation.

```typescript
// Create/Edit/Delete Account
invalidateQueries(["accounts"]);
invalidateQueries(["transactions"]); // Depend on accounts
invalidateQueries(["summary"]);

// Create/Edit/Delete Transaction
invalidateQueries(["transactions"]);
invalidateQueries(["summary"]);

// Create/Edit/Delete Category
invalidateQueries(["categories"]);
invalidateQueries(["transactions"]); // Show category
invalidateQueries(["summary"]);
```
