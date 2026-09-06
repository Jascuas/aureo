import { z } from "zod";

import { TRANSACTION_TYPE_NAMES } from "@/features/transaction-types/lib/transaction-types";
import {
  addCalendarDays,
  calendarDateSchema,
  getCalendarDateRange,
  getDateRange,
} from "@/lib/date-range";

const summaryDateRangeFields = {
  accountId: z.string().trim().min(1).max(128).optional(),
  from: calendarDateSchema.optional(),
  to: calendarDateSchema.optional(),
};

const validateDateOrder = (
  { from, to }: { from?: string; to?: string },
  ctx: z.RefinementCtx,
) => {
  if (from && to && from > to) {
    ctx.addIssue({
      code: "custom",
      message: "The start date must not be after the end date",
      path: ["to"],
    });
  }
};

export const summaryOverviewQuerySchema = z
  .object(summaryDateRangeFields)
  .superRefine(validateDateOrder);

export const summaryOverTimeQuerySchema = z
  .object(summaryDateRangeFields)
  .superRefine(validateDateOrder);

export const summaryCategoryQuerySchema = z
  .object({
    ...summaryDateRangeFields,
    top: z.coerce.number().int().positive().max(20).default(3),
    type: z.enum([...TRANSACTION_TYPE_NAMES, "All"]).default("All"),
  })
  .superRefine(validateDateOrder);

export const summaryPayeeQuerySchema = z
  .object({
    ...summaryDateRangeFields,
    top: z.coerce.number().int().positive().max(50).default(10),
    type: z.enum(TRANSACTION_TYPE_NAMES).default("Expense"),
  })
  .superRefine(validateDateOrder);

export type SummaryDateRangeInput = z.output<typeof summaryOverviewQuerySchema>;
export type SummaryCategoryQuery = z.output<typeof summaryCategoryQuerySchema>;
export type SummaryPayeeQuery = z.output<typeof summaryPayeeQuerySchema>;

type SummaryDateRange = {
  endDate: Date;
  startDate: Date;
};

export const getSummaryDateRange = (
  input: SummaryDateRangeInput,
): SummaryDateRange => getDateRange(input);

export const getPreviousSummaryDateRange = (
  input: SummaryDateRangeInput,
): SummaryDateRange => {
  const { endCalendarDate, startCalendarDate } = getCalendarDateRange(input);
  const periodLength =
    (new Date(`${endCalendarDate}T00:00:00.000Z`).getTime() -
      new Date(`${startCalendarDate}T00:00:00.000Z`).getTime()) /
      86_400_000 +
    1;

  return getDateRange({
    from: addCalendarDays(startCalendarDate, -periodLength),
    to: addCalendarDays(endCalendarDate, -periodLength),
  });
};

export const getSummaryCalendarDateRange = (input: SummaryDateRangeInput) =>
  getCalendarDateRange(input);
