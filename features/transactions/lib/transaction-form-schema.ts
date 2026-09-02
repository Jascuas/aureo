import { z } from "zod";

export const transactionFormSchema = z.object({
  date: z.coerce.date(),
  accountId: z.string(),
  categoryId: z.string().nullable().optional(),
  payee: z.string(),
  amount: z.string(),
  notes: z.string().nullable().optional(),
  transactionTypeId: z.string(),
});

export const transactionMutationSchema = transactionFormSchema.extend({
  amount: z.number().int(),
});

export type TransactionFormValues = z.input<typeof transactionFormSchema>;
export type TransactionMutationValues = z.input<
  typeof transactionMutationSchema
>;
