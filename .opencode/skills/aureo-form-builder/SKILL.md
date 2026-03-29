# Aureo Form Builder

Genera forms completos con validación Zod y React Hook Form siguiendo los patrones de Aureo.

## Cuándo Usar

- Crear nuevo form para CRUD operations
- Añadir form con validación compleja
- Generar form + sheet wrapper

## Patrón de Generación

### Input Esperado

```
Entity: Account
Fields: name (text, required)
Actions: Create, Edit, Delete
Validation: insertAccountSchema
```

### Output Generado

#### 1. Form Component

```typescript
// features/accounts/components/account-form.tsx
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { insertAccountSchema } from "@/db/schema";

const formSchema = insertAccountSchema.pick({
  name: true,
});

type FormValues = z.infer<typeof formSchema>;

type AccountFormProps = {
  id?: string;
  defaultValues?: FormValues;
  onSubmit: (values: FormValues) => void;
  onDelete?: () => void;
  disabled?: boolean;
};

export const AccountForm = ({
  id,
  defaultValues,
  onSubmit,
  onDelete,
  disabled,
}: AccountFormProps) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const handleSubmit = (values: FormValues) => {
    onSubmit(values);
  };

  const handleDelete = () => {
    onDelete?.();
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-4 pt-4"
      >
        <FormField
          name="name"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input
                  disabled={disabled}
                  placeholder="e.g. Checking, Savings, Credit Card"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button className="w-full" disabled={disabled}>
          {id ? "Save changes" : "Create account"}
        </Button>
        {!!id && (
          <Button
            type="button"
            disabled={disabled}
            onClick={handleDelete}
            className="w-full"
            variant="outline"
          >
            <Trash className="mr-2 size-4" />
            Delete account
          </Button>
        )}
      </form>
    </Form>
  );
};
```

#### 2. New Entity Sheet

```typescript
// features/accounts/components/new-account-sheet.tsx
import { Loader2 } from "lucide-react";
import { z } from "zod";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { insertAccountSchema } from "@/db/schema";
import { useCreateAccount } from "@/features/accounts/api/use-create-account";
import { useNewAccount } from "@/features/accounts/hooks/use-new-account";

import { AccountForm } from "./account-form";

const formSchema = insertAccountSchema.pick({
  name: true,
});

type FormValues = z.infer<typeof formSchema>;

export const NewAccountSheet = () => {
  const { isOpen, onClose } = useNewAccount();
  const mutation = useCreateAccount();

  const onSubmit = (values: FormValues) => {
    mutation.mutate(values, {
      onSuccess: () => {
        onClose();
      },
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="space-y-4">
        <SheetHeader>
          <SheetTitle>New Account</SheetTitle>
          <SheetDescription>
            Create a new account to track your transactions.
          </SheetDescription>
        </SheetHeader>
        {mutation.isPending ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <AccountForm
            onSubmit={onSubmit}
            disabled={mutation.isPending}
          />
        )}
      </SheetContent>
    </Sheet>
  );
};
```

#### 3. Edit Entity Sheet

```typescript
// features/accounts/components/edit-account-sheet.tsx
import { Loader2 } from "lucide-react";
import { z } from "zod";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { insertAccountSchema } from "@/db/schema";
import { useDeleteAccount } from "@/features/accounts/api/use-delete-account";
import { useEditAccount } from "@/features/accounts/api/use-edit-account";
import { useGetAccount } from "@/features/accounts/api/use-get-account";
import { useOpenAccount } from "@/features/accounts/hooks/use-open-account";
import { useConfirm } from "@/hooks/use-confirm";

import { AccountForm } from "./account-form";

const formSchema = insertAccountSchema.pick({
  name: true,
});

type FormValues = z.infer<typeof formSchema>;

export const EditAccountSheet = () => {
  const { isOpen, onClose, id } = useOpenAccount();

  const [ConfirmDialog, confirm] = useConfirm(
    "Are you sure?",
    "You are about to delete this account."
  );

  const accountQuery = useGetAccount(id);
  const editMutation = useEditAccount(id);
  const deleteMutation = useDeleteAccount(id);

  const isPending = editMutation.isPending || deleteMutation.isPending;

  const isLoading = accountQuery.isLoading;

  const onSubmit = (values: FormValues) => {
    editMutation.mutate(values, {
      onSuccess: () => {
        onClose();
      },
    });
  };

  const onDelete = async () => {
    const ok = await confirm();

    if (ok) {
      deleteMutation.mutate(undefined, {
        onSuccess: () => {
          onClose();
        },
      });
    }
  };

  const defaultValues = accountQuery.data
    ? {
        name: accountQuery.data.name,
      }
    : {
        name: "",
      };

  return (
    <>
      <ConfirmDialog />
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="space-y-4">
          <SheetHeader>
            <SheetTitle>Edit Account</SheetTitle>
            <SheetDescription>
              Edit an existing account.
            </SheetDescription>
          </SheetHeader>
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <AccountForm
              id={id}
              onSubmit={onSubmit}
              disabled={isPending}
              defaultValues={defaultValues}
              onDelete={onDelete}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};
```

#### 4. Zustand Stores

**use-new-account.ts**:

```typescript
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

**use-open-account.ts**:

```typescript
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

## Field Types

### Text Input

```typescript
<FormField
  name="name"
  control={form.control}
  render={({ field }) => (
    <FormItem>
      <FormLabel>Name</FormLabel>
      <FormControl>
        <Input
          disabled={disabled}
          placeholder="Enter name"
          {...field}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

### Textarea

```typescript
<FormField
  name="notes"
  control={form.control}
  render={({ field }) => (
    <FormItem>
      <FormLabel>Notes</FormLabel>
      <FormControl>
        <Textarea
          {...field}
          value={field.value ?? ""}
          disabled={disabled}
          placeholder="Optional notes"
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

### Date Picker

```typescript
<FormField
  name="date"
  control={form.control}
  render={({ field }) => (
    <FormItem>
      <FormLabel>Date</FormLabel>
      <FormControl>
        <DatePicker
          value={field.value}
          onChange={field.onChange}
          disabled={disabled}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

### Select

```typescript
<FormField
  name="accountId"
  control={form.control}
  render={({ field }) => (
    <FormItem>
      <FormLabel>Account</FormLabel>
      <FormControl>
        <GenericSelect
          placeholder="Select an account"
          options={accountOptions}
          onCreate={onCreateAccount}
          value={field.value}
          onChange={field.onChange}
          disabled={disabled}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

### Amount Input

```typescript
<FormField
  name="amount"
  control={form.control}
  render={({ field }) => (
    <FormItem>
      <FormLabel>Amount</FormLabel>
      <FormControl>
        <AmountInput
          {...field}
          disabled={disabled}
          placeholder="0.00"
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

## Checklist

- [ ] Form component en `features/[entity]/components/[entity]-form.tsx`
- [ ] New sheet en `features/[entity]/components/new-[entity]-sheet.tsx`
- [ ] Edit sheet en `features/[entity]/components/edit-[entity]-sheet.tsx`
- [ ] Zustand stores en `features/[entity]/hooks/`
- [ ] Zod validation con `zodResolver`
- [ ] Disabled state durante mutations
- [ ] Loading state con `Loader2`
- [ ] Confirm dialog para delete
- [ ] Toast notifications (en mutation hooks)
- [ ] Type-safe con `FormValues`
