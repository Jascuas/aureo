import { Loader2 } from "lucide-react";
import { useMemo } from "react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useDeleteCategory } from "@/features/categories/api/use-delete-category";
import { useEditCategory } from "@/features/categories/api/use-edit-category";
import { useGetCategories } from "@/features/categories/api/use-get-categories";
import { useGetCategory } from "@/features/categories/api/use-get-category";
import { useOpenCategory } from "@/features/categories/hooks/use-open-category";
import type { CategoryFormValues } from "@/features/categories/lib/category-form-schema";
import { useConfirm } from "@/hooks/use-confirm";

import { CategoryForm } from "./category-form";

export const EditCategorySheet = () => {
  const { isOpen, onClose, id } = useOpenCategory();

  const [ConfirmDialog, confirm] = useConfirm(
    "¿Quieres eliminar la categoría?",
    "Esta acción eliminará la categoría seleccionada.",
  );

  const categoryQuery = useGetCategory(id);
  const editMutation = useEditCategory(id);
  const deleteMutation = useDeleteCategory(id);
  const categoriesQuery = useGetCategories();

  const getDescendantIds = (categoryId: string): string[] => {
    const descendants: string[] = [categoryId];
    const children =
      categoriesQuery.data?.filter((c) => c.parentId === categoryId) ?? [];

    for (const child of children) {
      descendants.push(...getDescendantIds(child.id));
    }

    return descendants;
  };

  const categoryOptions = useMemo(() => {
    if (!categoriesQuery.data || !id) return [];

    const excludedIds = getDescendantIds(id);

    return categoriesQuery.data
      .filter((category) => !excludedIds.includes(category.id))
      .map((category) => ({
        label: category.name,
        value: category.id,
      }));
  }, [categoriesQuery.data, id]);

  const isPending = editMutation.isPending || deleteMutation.isPending;

  const isLoading = categoryQuery.isLoading || categoriesQuery.isLoading;
  const hasReferenceError = categoryQuery.isError || categoriesQuery.isError;

  const onSubmit = (values: CategoryFormValues) => {
    editMutation.mutate(values, {
      onSuccess: () => {
        onClose();
      },
    });
  };

  const defaultValues = categoryQuery.data
    ? {
        name: categoryQuery.data.name,
        parentId: categoryQuery.data.parentId ?? null,
      }
    : {
        name: "",
        parentId: null,
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

  return (
    <>
      <ConfirmDialog />
      <Sheet
        open={isOpen}
        onOpenChange={(open) => {
          if (!open && !isPending) onClose();
        }}
      >
        <SheetContent className="space-y-4">
          <SheetHeader>
            <SheetTitle>Editar categoría</SheetTitle>

            <SheetDescription>Edita una categoría existente.</SheetDescription>
          </SheetHeader>

          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="text-muted-foreground size-4 animate-spin" />
            </div>
          ) : hasReferenceError ? (
            <p className="text-sm text-destructive" role="alert">
              No se pudieron cargar los datos de la categoría. Cierra la ventana e
              inténtalo de nuevo.
            </p>
          ) : categoryQuery.data ? (
            <CategoryForm
              id={id}
              defaultValues={defaultValues}
              onSubmit={onSubmit}
              disabled={isPending}
              onDelete={onDelete}
              categoryOptions={categoryOptions}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
};
