import { and, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";

import { db } from "@/db/drizzle";
import {
  categoryAmountSql,
  expensesAmountSql,
  incomeAmountSql,
  transactionBalanceDeltaCaseSql,
} from "@/db/helpers";
import { accounts, categories, transactions } from "@/db/schema";
import {
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

type OverviewFinancialTotals = {
  currentExpensesMilliunits: number;
  currentIncomeMilliunits: number;
  previousExpensesMilliunits: number;
  previousIncomeMilliunits: number;
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

export type SummaryAccountBreakdown = {
  id: string;
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

const financialTotalsSql = ({ endDate, startDate }: SummaryDateRange) => ({
  expensesMilliunits: sql<number>`
    COALESCE(SUM(
      CASE
        WHEN ${transactions.date} >= ${startDate} AND ${transactions.date} < ${getExclusiveEndDate(endDate)}
        THEN CASE
          WHEN ${transactions.transactionTypeId} = 'expense' THEN ABS(${transactions.amount})
          WHEN ${transactions.transactionTypeId} = 'refund' THEN -ABS(${transactions.amount})
          ELSE 0
        END
        ELSE 0
      END
    ), 0)
  `.mapWith(Number),
  incomeMilliunits: sql<number>`
    COALESCE(SUM(
      CASE
        WHEN ${transactions.date} >= ${startDate} AND ${transactions.date} < ${getExclusiveEndDate(endDate)}
          AND ${transactions.transactionTypeId} = 'income'
        THEN ABS(${transactions.amount})
        ELSE 0
      END
    ), 0)
  `.mapWith(Number),
});

const getOverviewFinancialTotals = async (
  userId: string,
  currentRange: SummaryDateRange,
  previousRange: SummaryDateRange,
  accountId?: string,
): Promise<OverviewFinancialTotals> => {
  const currentTotals = financialTotalsSql(currentRange);
  const previousTotals = financialTotalsSql(previousRange);
  const [row] = await db
    .select({
      currentExpensesMilliunits: currentTotals.expensesMilliunits,
      currentIncomeMilliunits: currentTotals.incomeMilliunits,
      previousExpensesMilliunits: previousTotals.expensesMilliunits,
      previousIncomeMilliunits: previousTotals.incomeMilliunits,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(
      and(
        accountScope(userId, accountId),
        gte(transactions.date, previousRange.startDate),
        lt(transactions.date, getExclusiveEndDate(currentRange.endDate)),
      ),
    );

  return {
    currentExpensesMilliunits: row?.currentExpensesMilliunits ?? 0,
    currentIncomeMilliunits: row?.currentIncomeMilliunits ?? 0,
    previousExpensesMilliunits: row?.previousExpensesMilliunits ?? 0,
    previousIncomeMilliunits: row?.previousIncomeMilliunits ?? 0,
  };
};

const transactionBalanceSinceSql = (startDate: Date) => sql<number>`
  COALESCE(SUM(
    CASE
      WHEN ${transactions.date} >= ${startDate}
      THEN ${transactionBalanceDeltaCaseSql}
      ELSE 0
    END
  ), 0)
`.mapWith(Number);

const getBalanceWindow = async (
  userId: string,
  range: SummaryDateRange,
  accountId?: string,
) => {
  const balanceRows = await db
    .select({
      afterEndDeltaMilliunits: transactionBalanceSinceSql(
        getExclusiveEndDate(range.endDate),
      ),
      currentBalanceMilliunits: sql<number>`COALESCE(${accounts.balance}, 0)`.mapWith(Number),
      sinceStartDeltaMilliunits: transactionBalanceSinceSql(range.startDate),
    })
    .from(accounts)
    .leftJoin(transactions, eq(transactions.accountId, accounts.id))
    .where(
      and(
        eq(accounts.userId, userId),
        accountId ? eq(accounts.id, accountId) : undefined,
      ),
    )
    .groupBy(accounts.id, accounts.balance);

  const {
    afterEndDeltaMilliunits,
    currentBalanceMilliunits,
    sinceStartDeltaMilliunits,
  } = balanceRows.reduce(
    (totals, row) => ({
      afterEndDeltaMilliunits:
        totals.afterEndDeltaMilliunits + row.afterEndDeltaMilliunits,
      currentBalanceMilliunits:
        totals.currentBalanceMilliunits + row.currentBalanceMilliunits,
      sinceStartDeltaMilliunits:
        totals.sinceStartDeltaMilliunits + row.sinceStartDeltaMilliunits,
    }),
    {
      afterEndDeltaMilliunits: 0,
      currentBalanceMilliunits: 0,
      sinceStartDeltaMilliunits: 0,
    },
  );
  const balanceAtEndMilliunits = currentBalanceMilliunits - afterEndDeltaMilliunits;
  const balanceAtStartMilliunits = currentBalanceMilliunits - sinceStartDeltaMilliunits;

  return {
    balanceAtEndMilliunits,
    balanceAtStartMilliunits,
    changeMilliunits: balanceAtEndMilliunits - balanceAtStartMilliunits,
  };
};

// Stored timestamps represent UTC instants; convert to the reporting timezone before formatting.
const summaryDaySql = sql<string>`to_char(${transactions.date} AT TIME ZONE 'UTC' AT TIME ZONE ${DATE_RANGE_TIME_ZONE}, 'YYYY-MM-DD')`;

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
  const [financialTotals, balanceWindow] = await Promise.all([
    getOverviewFinancialTotals(userId, currentRange, previousRange, input.accountId),
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
        financialTotals.currentExpensesMilliunits,
        financialTotals.previousExpensesMilliunits,
      ),
      income: toSummaryMetric(
        financialTotals.currentIncomeMilliunits,
        financialTotals.previousIncomeMilliunits,
      ),
    },
  };
};

export const getSummaryAccountBreakdown = async (
  userId: string,
): Promise<SummaryAccountBreakdown[]> => {
  const rows = await db
    .select({
      id: accounts.id,
      name: accounts.name,
      balanceMilliunits: accounts.balance,
    })
    .from(accounts)
    .where(eq(accounts.userId, userId))
    .orderBy(desc(accounts.balance));

  return rows.map(({ balanceMilliunits, id, name }) => ({
    id,
    name,
    value: convertAmountFromMilliunits(Number(balanceMilliunits ?? 0)),
  }));
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

  const rows = await db.execute<SummaryBreakdownRow>(sql`
    WITH category_totals AS (
      SELECT
        ${transactions.categoryId} AS "categoryId",
        COALESCE(${categories.name}, 'Sin categoría') AS name,
        COALESCE(SUM(${categoryAmountSql}), 0)::double precision AS "valueMilliunits"
      FROM ${transactions}
      INNER JOIN ${accounts} ON ${transactions.accountId} = ${accounts.id}
      LEFT JOIN ${categories} ON ${transactions.categoryId} = ${categories.id}
      WHERE ${transactionScope(userId, getSummaryDateRange(input), input.accountId)}
        AND ${inArray(
          transactions.transactionTypeId,
          getSummaryTransactionTypeIds(input.type),
        )}
      GROUP BY ${transactions.categoryId}, ${categories.name}
    ), ranked_categories AS (
      SELECT
        name,
        "valueMilliunits",
        ROW_NUMBER() OVER (ORDER BY "valueMilliunits" DESC, name ASC) AS category_rank
      FROM category_totals
      WHERE "categoryId" IS NOT NULL
    ), summary_rows AS (
      SELECT name, "valueMilliunits" FROM ranked_categories WHERE category_rank <= ${input.top}
      UNION ALL
      SELECT 'Otros', SUM("valueMilliunits")
      FROM ranked_categories
      WHERE category_rank > ${input.top}
      HAVING COUNT(*) > 0
      UNION ALL
      SELECT name, "valueMilliunits" FROM category_totals WHERE "categoryId" IS NULL
    )
    SELECT name, "valueMilliunits" FROM summary_rows
    ORDER BY "valueMilliunits" DESC, name ASC
  `);

  return {
    ok: true,
    data: toSummaryBreakdown(rows.rows),
  };
};

export const getSummaryPayeeBreakdown = async (
  userId: string,
  input: SummaryPayeeQuery,
): Promise<SummaryOperationResult<SummaryBreakdown[]>> => {
  if (!(await isOwnedAccount(userId, input.accountId))) {
    return { ok: false, reason: "account_not_found" };
  }

  const valueMilliunits = sql<number>`SUM(${categoryAmountSql})`.mapWith(Number);
  const rows = await db
    .select({
      name: transactions.payee,
      valueMilliunits,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(
      and(
        transactionScope(userId, getSummaryDateRange(input), input.accountId),
        inArray(transactions.transactionTypeId, getSummaryTransactionTypeIds(input.type)),
      ),
    )
    .groupBy(transactions.payee)
    .orderBy(desc(valueMilliunits), transactions.payee)
    .limit(input.top);

  return {
    ok: true,
    data: toSummaryBreakdown(rows),
  };
};
