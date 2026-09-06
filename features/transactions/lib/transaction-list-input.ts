import { z } from "zod";

import { calendarDateSchema } from "@/lib/date-range";

export const TRANSACTION_BULK_LIMIT = 100;

const cursorInstantPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

const transactionCursorPayloadSchema = z
  .object({
    date: z
      .string()
      .refine(
        (value) =>
          cursorInstantPattern.test(value) && !Number.isNaN(new Date(value).getTime()),
        "Cursor date must be a valid ISO instant",
      ),
    id: z.string().trim().min(1).max(128),
  })
  .strict();

export type TransactionCursor = {
  date: Date;
  id: string;
};

export const transactionCursorSchema = z
  .string()
  .min(1)
  .max(512)
  .transform((serializedCursor, ctx): TransactionCursor => {
    let value: unknown;

    try {
      value = JSON.parse(serializedCursor);
    } catch {
      ctx.addIssue({
        code: "custom",
        message: "Cursor must be valid JSON",
      });

      return z.NEVER;
    }

    const parsedCursor = transactionCursorPayloadSchema.safeParse(value);

    if (!parsedCursor.success) {
      ctx.addIssue({
        code: "custom",
        message: "Cursor must include a valid date and a non-empty id",
      });

      return z.NEVER;
    }

    return {
      date: new Date(parsedCursor.data.date),
      id: parsedCursor.data.id,
    };
  });

export const transactionListQuerySchema = z
  .object({
    accountId: z.string().trim().min(1).max(128).optional(),
    cursor: transactionCursorSchema.optional(),
    from: calendarDateSchema.optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    to: calendarDateSchema.optional(),
  })
  .superRefine(({ from, to }, ctx) => {
    if (from && to && from > to) {
      ctx.addIssue({
        code: "custom",
        message: "The start date must not be after the end date",
        path: ["to"],
      });
    }
  });

export const transactionIdsSchema = z
  .array(z.string().trim().min(1).max(128))
  .min(1)
  .max(TRANSACTION_BULK_LIMIT);

export type TransactionListQuery = z.output<typeof transactionListQuerySchema>;