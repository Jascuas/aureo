import { z } from "zod";

export const TRANSACTION_DATE_RANGE_TIME_ZONE = "Europe/Madrid";
export const TRANSACTION_BULK_LIMIT = 100;

const calendarDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const cursorInstantPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

const isCalendarDate = (value: string) => {
  if (!calendarDatePattern.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

const calendarDateSchema = z
  .string()
  .refine(isCalendarDate, "Date must use the yyyy-MM-dd format");

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

type DateRangeInput = Pick<TransactionListQuery, "from" | "to">;

type TimeZonePart = "day" | "hour" | "minute" | "month" | "second" | "year";

const getTimeZoneParts = (instant: Date) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    timeZone: TRANSACTION_DATE_RANGE_TIME_ZONE,
    year: "numeric",
  }).formatToParts(instant);

  return Object.fromEntries(
    parts
      .filter((part): part is Intl.DateTimeFormatPart & { type: TimeZonePart } =>
        ["day", "hour", "minute", "month", "second", "year"].includes(part.type),
      )
      .map((part) => [part.type, Number(part.value)]),
  ) as Record<TimeZonePart, number>;
};

const getTimeZoneOffset = (instant: Date) => {
  const parts = getTimeZoneParts(instant);
  const wallClockAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    instant.getUTCMilliseconds(),
  );

  return wallClockAsUtc - instant.getTime();
};

const zonedCalendarBoundaryToUtc = (
  calendarDate: string,
  boundary: "start" | "end",
) => {
  const time = boundary === "start" ? "00:00:00.000" : "23:59:59.999";
  const wallClockAsUtc = new Date(`${calendarDate}T${time}Z`);
  const initialOffset = getTimeZoneOffset(wallClockAsUtc);
  const adjustedInstant = new Date(wallClockAsUtc.getTime() - initialOffset);
  const adjustedOffset = getTimeZoneOffset(adjustedInstant);

  return new Date(wallClockAsUtc.getTime() - adjustedOffset);
};

const getCalendarDateInTransactionTimeZone = (instant: Date) => {
  const parts = getTimeZoneParts(instant);

  return `${parts.year.toString().padStart(4, "0")}-${parts.month
    .toString()
    .padStart(2, "0")}-${parts.day.toString().padStart(2, "0")}`;
};

const subtractCalendarDays = (calendarDate: string, days: number) => {
  const date = new Date(`${calendarDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - days);

  return date.toISOString().slice(0, 10);
};

export const getTransactionDateRange = ({ from, to }: DateRangeInput) => {
  const defaultTo = getCalendarDateInTransactionTimeZone(new Date());
  const startCalendarDate = from ?? subtractCalendarDays(defaultTo, 30);
  const endCalendarDate = to ?? defaultTo;

  return {
    endDate: zonedCalendarBoundaryToUtc(endCalendarDate, "end"),
    startDate: zonedCalendarBoundaryToUtc(startCalendarDate, "start"),
  };
};
