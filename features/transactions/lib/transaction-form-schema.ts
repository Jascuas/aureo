import { z } from "zod";

import {
  isSupportedTransactionTypeId,
  supportedTransactionTypeIdSchema,
} from "@/features/transaction-types/lib/transaction-types";

export const transactionFormSchema = z.object({
  date: z.date(),
  accountId: z.string().min(1, "Selecciona una cuenta."),
  categoryId: z.string().nullable().optional(),
  payee: z.string().trim().min(1, "Introduce un beneficiario."),
  amount: z
    .string()
    .trim()
    .refine(
      (value) => Number.isFinite(Number(value)) && Number(value) !== 0,
      "Introduce un importe distinto de cero.",
    ),
  notes: z.string().nullable().optional(),
  transactionTypeId: z
    .string()
    .refine(isSupportedTransactionTypeId, "Selecciona un tipo de transacción válido."),
});

export const transactionMutationSchema = transactionFormSchema.extend({
  date: z.string().date(),
  amount: z.number().int(),
  transactionTypeId: supportedTransactionTypeIdSchema,
});

export type TransactionFormValues = z.input<typeof transactionFormSchema>;
export type TransactionMutationValues = z.output<
  typeof transactionMutationSchema
>;
