import { z } from "zod";

export const categoryFormSchema = z.object({
  name: z.string(),
  parentId: z.string().nullable().optional(),
});

export type CategoryFormValues = z.input<typeof categoryFormSchema>;
