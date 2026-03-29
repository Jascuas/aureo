# Aureo Form Builder

Generates forms with Zod + React Hook Form validation.

## When to Use This Skill

✅ **USE when**:

- Creating complete form for CRUD (create + edit + delete) of an entity
- Generating form + new sheet + edit sheet + zustand stores (complete set)
- Implementing complex validation with Zod + React Hook Form
- Need form with loading states, disabled states, confirm dialogs
- Form uses standard fields: Input, Textarea, DatePicker, Select, AmountInput

❌ **DON'T USE when**:

- You only need a simple form without sheets → write directly without skill
- Form has very custom business logic → implement manually
- Only editing existing form (not creating from scratch) → edit file directly

## Structure (3 files)

**1. Form**: `features/[entity]/components/[entity]-form.tsx`

- Props: `id?, defaultValues?, onSubmit, onDelete?, disabled?`
- React Hook Form + zodResolver
- Show delete button only if `id` exists

**2. New Sheet**: `new-[entity]-sheet.tsx`

- Zustand hook: `useNew[Entity]()`
- Mutation hook: `useCreate[Entity]()`
- Loading state: `Loader2` during `isPending`

**3. Edit Sheet**: `edit-[entity]-sheet.tsx`

- Zustand hook: `useOpen[Entity]()` (with `id`)
- Query: `useGet[Entity](id)`
- Mutations: `useEdit + useDelete`
- Confirm dialog: `useConfirm` for delete
- Loading states: query + mutations

## Zustand Stores

**use-new-[entity].ts**:

```typescript
type NewState = { isOpen: boolean; onOpen: () => void; onClose: () => void };
export const useNewEntity = create<NewState>((set) => ({
  isOpen: false,
  onOpen: () => set({ isOpen: true }),
  onClose: () => set({ isOpen: false }),
}));
```

**use-open-[entity].ts**: Same + `id?: string` + `onOpen: (id: string) => void`

## Field Types

**Input**: `<Input {...field} />`  
**Textarea**: `<Textarea {...field} value={field.value ?? ""} />`  
**DatePicker**: `<DatePicker value={field.value} onChange={field.onChange} />`  
**Select**: `<GenericSelect options={} value={} onChange={} onCreate={} />`  
**Amount**: `<AmountInput {...field} />` (see `lib/utils.ts` for milliunits conversion)

## Checklist

- Form component + validation schema
- New sheet + create mutation
- Edit sheet + edit/delete mutations + confirm dialog
- Zustand stores (new + open)
- Loading/disabled states
- Toast notifications (in mutation hooks)

Complete reference: See `features/accounts/components/` and `state-management.md`
