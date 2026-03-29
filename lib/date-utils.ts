import { parse, subDays } from "date-fns";

/**
 * Parses date range query parameters (from/to) for API endpoints.
 * Returns default date range (last 30 days) if parameters are missing.
 *
 * @param from - Start date in "yyyy-MM-dd" format (optional)
 * @param to - End date in "yyyy-MM-dd" format (optional)
 * @returns Object with startDate and endDate as Date objects
 */
export const parseDateRange = (
  from?: string,
  to?: string,
): { startDate: Date; endDate: Date } => {
  const defaultTo = new Date();
  const defaultFrom = subDays(defaultTo, 30);

  const startDate = from ? parse(from, "yyyy-MM-dd", new Date()) : defaultFrom;
  const endDate = to ? parse(to, "yyyy-MM-dd", new Date()) : defaultTo;

  return { startDate, endDate };
};
