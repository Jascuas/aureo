import { and, eq, gte, inArray, lt, sql, sum } from "drizzle-orm";

import { db } from "@/db/drizzle";
import {
  categoryAmountSql,
  expensesAmountSql,
  incomeAmountSql,
  transactionBalanceDeltaSql,
} from "@/db/helpers";
import { accounts, categories, transactions } from "@/db/schema";
import {
  buildCategorySummary,
  buildPayeeSummary,
  calculateSummaryPercentageChange,
  type SummaryBreakdownRow,
} from "@/features/summary/lib/summary-contract";
import {
  getPreviousSummaryDateRange,
  getSummaryCalendarDateRange,
  getSummaryDateRange,
  type SummaryCategoryQuery,
  type SummaryDateRangeInput,
  type SummaryPayeeQuery,
} from "@/features/summary/lib/summary-input";
import { getSummaryTransactionTypeIds } from "@/features/transaction-types/lib/transaction-types";
import {
  addCalendarDays,
  DATE_RANGE_TIME_ZONE,
  getExclusiveEndDate,
} from "@/lib/date-range";
import { convertAmountFromMilliunits } from "@/lib/utils";

type SummaryDateRange = {
  endDate: Date;
  startDate: Date;
};

type SummaryOperationResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "account_not_found" };

type FinancialTotals = {
  expensesMilliunits: number;
  incomeMilliunits: number;
};

export type SummaryOverview = {
  balance: SummaryMetric;
  expenses: SummaryMetric;
  income: SummaryMetric;
};

type SummaryMetric = {
  amount: number;
  changeAmount: number;
  changePtc: number;
};

export type SummaryOverTimePoint = {
  balance: number;
  date: string;
  expenses: number;
  income: number;
};

export type SummaryBreakdown = {
  name: string;
  value: number;
};

const accountScope = (userId: string, accountId?: string) =>
  and(
    eq(accounts.userId, userId),
    accountId ? eq(transactions.accountId, accountId) : undefined,
  );

const transactionScope = (
  userId: string,
  { endDate, startDate }: SummaryDateRange,
  accountId?: string,
) =>
  and(
    accountScope(userId, accountId),
    gte(transactions.date, startDate),
    lt(transactions.date, getExclusiveEndDate(endDate)),
  );

const isOwnedAccount = async (userId: string, accountId?: string) => {
  if (!accountId) {
    return true;
  }

  const [account] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)));

  return Boolean(account);
};

const getFinancialTotals = async (
  userId: string,
  range: SummaryDateRange,
  accountId?: string,
): Promise<FinancialTotals> => {
  const [row] = await db
    .select({
      expensesMilliunits: expensesAmountSql,
      incomeMilliunits: incomeAmountSql,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(transactionScope(userId, range, accountId));

  return {
    expensesMilliunits: row?.expensesMilliunits ?? 0,
    incomeMilliunits: row?.incomeMilliunits ?? 0,
  };
};

const getBalanceWindow = async (
  userId: string,
  range: SummaryDateRange,
  accountId?: string,
) => {
  const [balanceRow, afterEndRow, sinceStartRow] = await Promise.all([
    db
      .select({ currentBalanceMilliunits: sum(accounts.balance).mapWith(Number) })
      .from(accounts)
      .where(
        and(
          eq(accounts.userId, userId),
          accountId ? eq(accounts.id, accountId) : undefined,
        ),
      )
      .then(([row]) => row),
    db
      .select({ balanceDeltaMilliunits: transactionBalanceDeltaSql })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(
        and(
          accountScope(userId, accountId),
          gte(transactions.date, getExclusiveEndDate(range.endDate)),
        ),
      )
      .then(([row]) => row),
    db
      .select({ balanceDeltaMilliunits: transactionBalanceDeltaSql })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(
        and(
          accountScope(userId, accountId),
          gte(transactions.date, range.startDate),
        ),
      )
      .then(([row]) => row),
  ]);

  const currentBalanceMilliunits = balanceRow?.currentBalanceMilliunits ?? 0;
  const balanceAtEndMilliunits =
    currentBalanceMilliunits - (afterEndRow?.balanceDeltaMilliunits ?? 0);
  const balanceAtStartMilliunits =
    currentBalanceMilliunits - (sinceStartRow?.balanceDeltaMilliunits ?? 0);

  return {
    balanceAtEndMilliunits,
    balanceAtStartMilliunits,
    changeMilliunits: balanceAtEndMilliunits - balanceAtStartMilliunits,
  };
};

const summaryDaySql = sql<string>`to_char(${transactions.date} AT TIME ZONE ${DATE_RANGE_TIME_ZONE}, 'YYYY-MM-DD')`;

const toSummaryMetric = (
  currentMilliunits: number,
  previousMilliunits: number,
): SummaryMetric => ({
  amount: convertAmountFromMilliunits(currentMilliunits),
  changeAmount: convertAmountFromMilliunits(currentMilliunits - previousMilliunits),
  changePtc: calculateSummaryPercentageChange(currentMilliunits, previousMilliunits),
});

const toExpenseSummaryMetric = (
  currentMilliunits: number,
  previousMilliunits: number,
): SummaryMetric => ({
  amount: convertAmountFromMilliunits(currentMilliunits),
  changeAmount: convertAmountFromMilliunits(previousMilliunits - currentMilliunits),
  changePtc: -calculateSummaryPercentageChange(
    currentMilliunits,
    previousMilliunits,
  ),
});

export const getSummaryOverview = async (
  userId: string,
  input: SummaryDateRangeInput,
): Promise<SummaryOperationResult<SummaryOverview>> => {
  if (!(await isOwnedAccount(userId, input.accountId))) {
    return { ok: false, reason: "account_not_found" };
  }

  const currentRange = getSummaryDateRange(input);
  const previousRange = getPreviousSummaryDateRange(input);
  const [currentTotals, previousTotals, balanceWindow] = await Promise.all([
    getFinancialTotals(userId, currentRange, input.accountId),
    getFinancialTotals(userId, previousRange, input.accountId),
    getBalanceWindow(userId, currentRange, input.accountId),
  ]);

  return {
    ok: true,
    data: {
      balance: {
        amount: convertAmountFromMilliunits(balanceWindow.balanceAtEndMilliunits),
        changeAmount: convertAmountFromMilliunits(balanceWindow.changeMilliunits),
        changePtc: calculateSummaryPercentageChange(
          balanceWindow.balanceAtEndMilliunits,
          balanceWindow.balanceAtStartMilliunits,
        ),
      },
      expenses: toExpenseSummaryMetric(
        currentTotals.expensesMilliunits,
        previousTotals.expensesMilliunits,
      ),
      income: toSummaryMetric(
        currentTotals.incomeMilliunits,
        previousTotals.incomeMilliunits,
      ),
    },
  };
};

export const getSummaryOverTime = async (
  userId: string,
  input: SummaryDateRangeInput,
): Promise<SummaryOperationResult<SummaryOverTimePoint[]>> => {
  if (!(await isOwnedAccount(userId, input.accountId))) {
    return { ok: false, reason: "account_not_found" };
  }

  const range = getSummaryDateRange(input);
  const { endCalendarDate, startCalendarDate } = getSummaryCalendarDateRange(input);
  const [dailyRows, balanceWindow] = await Promise.all([
    db
      .select({
        date: summaryDaySql,
        expensesMilliunits: expensesAmountSql,
        incomeMilliunits: incomeAmountSql,
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(transactionScope(userId, range, input.accountId))
      .groupBy(summaryDaySql)
      .orderBy(summaryDaySql),
    getBalanceWindow(userId, range, input.accountId),
  ]);
  const dailyTotals = new Map(
    dailyRows.map(({ date, expensesMilliunits, incomeMilliunits }) => [
      date,
      {
        expensesMilliunits: expensesMilliunits ?? 0,
        incomeMilliunits: incomeMilliunits ?? 0,
      },
    ]),
  );

  const data: SummaryOverTimePoint[] = [];
  let runningBalanceMilliunits = balanceWindow.balanceAtStartMilliunits;

  for (
    let calendarDate = startCalendarDate;
    calendarDate <= endCalendarDate;
    calendarDate = addCalendarDays(calendarDate, 1)
  ) {
    const totals = dailyTotals.get(calendarDate) ?? {
      expensesMilliunits: 0,
      incomeMilliunits: 0,
    };
    runningBalanceMilliunits +=
      totals.incomeMilliunits - totals.expensesMilliunits;

    data.push({
      balance: convertAmountFromMilliunits(runningBalanceMilliunits),
      date: calendarDate,
      expenses: convertAmountFromMilliunits(totals.expensesMilliunits),
      income: convertAmountFromMilliunits(totals.incomeMilliunits),
    });
  }

  return { ok: true, data };
};

const toSummaryBreakdown = (rows: SummaryBreakdownRow[]): SummaryBreakdown[] =>
  rows.map(({ name, valueMilliunits }) => ({
    name,
    value: convertAmountFromMilliunits(valueMilliunits),
  }));

export const getSummaryCategoryBreakdown = async (
  userId: string,
  input: SummaryCategoryQuery,
): Promise<SummaryOperationResult<SummaryBreakdown[]>> => {
  if (!(await isOwnedAccount(userId, input.accountId))) {
    return { ok: false, reason: "account_not_found" };
  }

  const rows = await db
    .select({
      categoryId: categories.id,
      name: sql<string>`COALESCE(${categories.name}, 'Sin categoría')`,
      valueMilliunits: sql<number>`SUM(${categoryAmountSql})`.mapWith(Number),
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        transactionScope(userId, getSummaryDateRange(input), input.accountId),
        inArray(transactions.transactionTypeId, getSummaryTransactionTypeIds(input.type)),
      ),
    )
    .groupBy(categories.id, categories.name);

  return {
    ok: true,
    data: toSummaryBreakdown(
      buildCategorySummary(
        rows.map(({ categoryId, name, valueMilliunits }) => ({
          isUncategorized: categoryId === null,
          name,
          valueMilliunits,
        })),
        input.top,
      ),
    ),
  };
};

export const getSummaryPayeeBreakdown = async (
  userId: string,
  input: SummaryPayeeQuery,
): Promise<SummaryOperationResult<SummaryBreakdown[]>> => {
  if (!(await isOwnedAccount(userId, input.accountId))) {
    return { ok: false, reason: "account_not_found" };
  }

  const rows = await db
    .select({
      name: transactions.payee,
      valueMilliunits: sql<number>`SUM(${categoryAmountSql})`.mapWith(Number),
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(
      and(
        transactionScope(userId, getSummaryDateRange(input), input.accountId),
        inArray(transactions.transactionTypeId, getSummaryTransactionTypeIds(input.type)),
      ),
    )
    .groupBy(transactions.payee);

  return {
    ok: true,
    data: toSummaryBreakdown(buildPayeeSummary(rows, input.top)),
  };
};
