import { z } from "zod";

export const accountFormSchema = z.object({
  name: z.string().trim().min(1, "Introduce un nombre para la cuenta."),
});

export type AccountFormValues = z.input<typeof accountFormSchema>;
