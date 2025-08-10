import { type ClassValue, clsx } from "clsx";
import {
  eachDayOfInterval,
  format,
  isSameDay,
  isValid,
  parseISO,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function convertAmountFromMilliunits(amount: number) {
  return Math.round(amount / 1000);
}

export function convertAmountToMilliunits(amount: number) {
  return Math.round(amount * 1000);
}

export function formatCurrency(value: number) {
  return Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(value);
}

export function calculatePercentageChange(current: number, previous: number) {
  if (previous === 0) {
    return previous === current ? 0 : 100;
  }

  return ((current - previous) / previous) * 100;
}

export function fillMissingDays(
  activeDays: {
    date: Date;
    income: number;
    expenses: number;
  }[],
  startDate: Date,
  endDate: Date,
) {
  if (activeDays.length === 0) return [];

  const allDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const transactionsByDay = allDays.map((day) => {
    const found = activeDays.find((d) => isSameDay(d.date, day));

    if (found) return found;
    else {
      return {
        date: day,
        income: 0,
        expenses: 0,
      };
    }
  });

  return transactionsByDay;
}

type Period = {
  from: string | Date | undefined;
  to: string | Date | undefined;
};

function toValidDate(date: string | Date | undefined, fallback: Date): Date {
  if (typeof date === "string") {
    const parsedDate = parseISO(date);
    return isValid(parsedDate) ? parsedDate : fallback;
  }
  return date instanceof Date && isValid(date) ? date : fallback;
}

export function formatDateRange(period?: Period) {
  const defaultTo = new Date();
  const defaultFrom = subDays(defaultTo, 30);

  const fromDate = toValidDate(period?.from, defaultFrom);
  const toDate = toValidDate(period?.to, defaultTo);

  if (period?.from && period?.to) {
    return `${format(fromDate, "LLL dd, y")} - ${format(toDate, "LLL dd, y")}`;
  }

  if (period?.from) {
    return format(fromDate, "LLL dd, y");
  }
  return `${format(defaultFrom, "LLL dd")} - ${format(defaultTo, "LLL dd, y")}`;
}

export function formatPercentage(
  value: number,
  options: { addPrefix?: boolean } = { addPrefix: false },
) {
  const result = new Intl.NumberFormat("es-ES", {
    style: "percent",
    minimumFractionDigits: 2,
  }).format(value / 100);

  if (options.addPrefix && value > 0) return `+${result}`;

  return result;
}

export function formatDate(date: Date | string) {
  return format(date, "LLL dd, y");
}

type Reducers<T> = {
  [K in keyof T]?: (acc: T[K], val: T[K]) => T[K];
};

export interface HasDate {
  date: string;
}

export function groupByPeriod<T extends HasDate>(
  data: T[],
  group: "day" | "week" | "month",
  reducers: Reducers<T>,
): T[] {
  if (!data.length) return [];

  const bucket = new Map<string, T>();

  for (const item of data) {
    const parsed = parseISO(item.date);
    const key =
      group === "week"
        ? format(startOfWeek(parsed, { weekStartsOn: 1 }), "yyyy-MM-dd")
        : group === "month"
          ? format(startOfMonth(parsed), "yyyy-MM-dd")
          : format(parsed, "yyyy-MM-dd");

    const current =
      bucket.get(key) ??
      (Object.fromEntries(
        Object.keys(reducers).map((f) => [f, 0]),
      ) as unknown as T & { date: string });

    current.date = key;

    for (const field in reducers) {
      const fn = reducers[field];
      if (fn) {
        const k = field as keyof T;
        current[k as Extract<keyof T, string>] = fn(
          current[k as Extract<keyof T, string>],
          item[k as Extract<keyof T, string>],
        );
      }
    }

    bucket.set(key, current);
  }

  return [...bucket.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export const txReducers = {
  income: (a = 0, v = 0) => a + v,
  expenses: (a = 0, v = 0) => a + v,
};

export const balReducers = {
  balance: (_prev: number, latest: number) => latest,
};
