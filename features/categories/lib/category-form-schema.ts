import { z } from "zod";

export const categoryFormSchema = z.object({
  name: z.string().trim().min(1, "Introduce un nombre para la categoría."),
  parentId: z.string().nullable().optional(),
});

export type CategoryFormValues = z.input<typeof categoryFormSchema>;
