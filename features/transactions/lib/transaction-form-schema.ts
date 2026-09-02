import { z } from "zod";

import {
  isSupportedTransactionTypeId,
  supportedTransactionTypeIdSchema,
} from "@/features/transaction-types/lib/transaction-types";

export const transactionFormSchema = z.object({
  date: z.coerce.date(),
  accountId: z.string(),
  categoryId: z.string().nullable().optional(),
  payee: z.string(),
  amount: z.string(),
  notes: z.string().nullable().optional(),
  transactionTypeId: z
    .string()
    .refine(isSupportedTransactionTypeId, "Select a supported transaction type"),
});

export const transactionMutationSchema = transactionFormSchema.extend({
  amount: z.number().int(),
  transactionTypeId: supportedTransactionTypeIdSchema,
});

export type TransactionFormValues = z.input<typeof transactionFormSchema>;
export type TransactionMutationValues = z.output<
  typeof transactionMutationSchema
>;
