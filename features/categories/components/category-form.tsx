import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Trash } from "lucide-react";
import { useForm } from "react-hook-form";

import { Select } from "@/components/inputs/select";
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
import {
  categoryFormSchema,
  type CategoryFormValues,
} from "@/features/categories/lib/category-form-schema";

type CategoryFormProps = {
  id?: string;
  defaultValues?: CategoryFormValues;
  onSubmit: (values: CategoryFormValues) => void;
  onDelete?: () => void;
  disabled?: boolean;
  categoryOptions?: { label: string; value: string }[];
};

export const CategoryForm = ({
  id,
  defaultValues,
  onSubmit,
  onDelete,
  disabled,
  categoryOptions = [],
}: CategoryFormProps) => {
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues,
  });

  const handleSubmit = (values: CategoryFormValues) => {
    if (
      values.parentId &&
      !categoryOptions.some((option) => option.value === values.parentId)
    ) {
      form.setError("parentId", {
        message: "Selecciona una categoría principal válida o déjala vacía.",
      });
      return;
    }

    onSubmit(values);
  };

  const handleDelete = () => {
    onDelete?.();
  };
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        autoCapitalize="off"
        autoComplete="off"
        className="space-y-4 pt-4"
      >
        <FormField
          name="name"
          control={form.control}
          disabled={disabled}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>

              <FormControl>
                <Input
                  disabled={disabled}
                  placeholder="p. ej., Alimentación o Viajes"
                  {...field}
                />
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="parentId"
          control={form.control}
          disabled={disabled}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoría principal (opcional)</FormLabel>

              <FormControl>
                <Select
                  placeholder="Selecciona una categoría principal"
                  options={categoryOptions}
                  value={field.value}
                  onChange={field.onChange}
                  disabled={disabled}
                  isClearable
                />
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        />

        <Button className="w-full" disabled={disabled}>
          {disabled && <Loader2 className="mr-2 size-4 animate-spin" />}
          {id ? "Guardar cambios" : "Crear categoría"}
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
            Eliminar categoría
          </Button>
        )}
      </form>
    </Form>
  );
};
