import { z } from "zod";

export const DATE_RANGE_TIME_ZONE = "Europe/Madrid";

const calendarDatePattern = /^\d{4}-\d{2}-\d{2}$/;

type TimeZonePart = "day" | "hour" | "minute" | "month" | "second" | "year";

type CalendarDateRangeInput = {
  from?: string;
  to?: string;
};

export const calendarDateSchema = z
  .string()
  .refine(
    (value) => {
      if (!calendarDatePattern.test(value)) {
        return false;
      }

      const parsed = new Date(`${value}T00:00:00.000Z`);

      return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
    },
    "Date must use the yyyy-MM-dd format",
  );

const getTimeZoneParts = (instant: Date) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    timeZone: DATE_RANGE_TIME_ZONE,
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

export const getCalendarDateInDateRangeTimeZone = (instant: Date) => {
  const parts = getTimeZoneParts(instant);

  return `${parts.year.toString().padStart(4, "0")}-${parts.month
    .toString()
    .padStart(2, "0")}-${parts.day.toString().padStart(2, "0")}`;
};

export const addCalendarDays = (calendarDate: string, days: number) => {
  const date = new Date(`${calendarDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
};

export const getCalendarDateRange = ({ from, to }: CalendarDateRangeInput) => {
  const endCalendarDate = to ?? getCalendarDateInDateRangeTimeZone(new Date());
  const startCalendarDate = from ?? addCalendarDays(endCalendarDate, -30);

  return { endCalendarDate, startCalendarDate };
};

export const getDateRange = (input: CalendarDateRangeInput) => {
  const { endCalendarDate, startCalendarDate } = getCalendarDateRange(input);

  return {
    endDate: zonedCalendarBoundaryToUtc(endCalendarDate, "end"),
    startDate: zonedCalendarBoundaryToUtc(startCalendarDate, "start"),
  };
};

export const getExclusiveEndDate = (endDate: Date) =>
  new Date(endDate.getTime() + 1);
