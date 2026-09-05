import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCreateCategory } from "@/features/categories/api/use-create-category";
import { useGetCategories } from "@/features/categories/api/use-get-categories";
import { useNewCategory } from "@/features/categories/hooks/use-new-category";
import type { CategoryFormValues } from "@/features/categories/lib/category-form-schema";

import { CategoryForm } from "./category-form";

export const NewCategorySheet = () => {
  const { isOpen, onClose } = useNewCategory();
  const mutation = useCreateCategory();

  const categoriesQuery = useGetCategories();
  const categoryOptions =
    categoriesQuery.data?.map((category) => ({
      label: category.name,
      value: category.id,
    })) ?? [];

  const onSubmit = (values: CategoryFormValues) => {
    mutation.mutate(values, {
      onSuccess: () => {
        onClose();
      },
    });
  };

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) onClose();
      }}
    >
      <SheetContent className="space-y-4">
        <SheetHeader>
          <SheetTitle>Nueva categoría</SheetTitle>

          <SheetDescription>
            Crea una categoría para organizar tus transacciones.
          </SheetDescription>
        </SheetHeader>

        {categoriesQuery.isError ? (
          <p className="text-sm text-destructive" role="alert">
            No se pudieron cargar las categorías principales. Cierra la ventana e
            inténtalo de nuevo.
          </p>
        ) : (
          <CategoryForm
            defaultValues={{
              name: "",
              parentId: null,
            }}
            categoryOptions={categoryOptions}
            onSubmit={onSubmit}
            disabled={mutation.isPending}
          />
        )}
      </SheetContent>
    </Sheet>
  );
};
