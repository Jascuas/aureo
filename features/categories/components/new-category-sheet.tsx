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
      label: `${"— ".repeat(category.depth)}${category.name}`,
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
    <Sheet open={isOpen || mutation.isPending} onOpenChange={onClose}>
      <SheetContent className="space-y-4">
        <SheetHeader>
          <SheetTitle>New Category</SheetTitle>

          <SheetDescription>
            Create a new category to organize your transactions.
          </SheetDescription>
        </SheetHeader>

        <CategoryForm
          defaultValues={{
            name: "",
            parentId: null,
          }}
          categoryOptions={categoryOptions}
          onSubmit={onSubmit}
          disabled={mutation.isPending}
        />
      </SheetContent>
    </Sheet>
  );
};
