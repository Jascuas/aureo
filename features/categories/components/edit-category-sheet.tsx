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
    "Are you sure?",
    "You are about to delete this category.",
  );

  const categoryQuery = useGetCategory(id);
  const editMutation = useEditCategory(id);
  const deleteMutation = useDeleteCategory(id);
  const categoriesQuery = useGetCategories();

  const categoryOptions = useMemo(() => {
    if (!categoriesQuery.data || !id) return [];

    const excludedIds = new Set([id]);
    let foundDescendant = true;

    while (foundDescendant) {
      foundDescendant = false;

      for (const category of categoriesQuery.data) {
        if (
          category.parentId !== null &&
          excludedIds.has(category.parentId) &&
          !excludedIds.has(category.id)
        ) {
          excludedIds.add(category.id);
          foundDescendant = true;
        }
      }
    }

    return categoriesQuery.data
      .filter((category) => !excludedIds.has(category.id))
      .map((category) => ({
        label: `${"— ".repeat(category.depth)}${category.name}`,
        value: category.id,
      }));
  }, [categoriesQuery.data, id]);

  const isPending = editMutation.isPending || deleteMutation.isPending;

  const isLoading = categoryQuery.isLoading;

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
      <Sheet open={isOpen || isPending} onOpenChange={onClose}>
        <SheetContent className="space-y-4">
          <SheetHeader>
            <SheetTitle>Edit Category</SheetTitle>

            <SheetDescription>Edit an existing category.</SheetDescription>
          </SheetHeader>

          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="text-muted-foreground size-4 animate-spin" />
            </div>
          ) : (
            <CategoryForm
              id={id}
              defaultValues={defaultValues}
              onSubmit={onSubmit}
              disabled={isPending}
              onDelete={onDelete}
              categoryOptions={categoryOptions}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};
