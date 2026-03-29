import { clerkMiddleware } from "@hono/clerk-auth";
import { zValidator } from "@hono/zod-validator";
import { differenceInDays, subDays } from "date-fns";
import { and, eq, gte, lte, sql, sum } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { db } from "@/db/drizzle";
import { accounts, transactions, transactionTypes } from "@/db/schema";
import { parseDateRange } from "@/lib/date-utils";
import {
  calculatePercentageChange,
  convertAmountFromMilliunits,
} from "@/lib/utils";
import { requireAuth } from "@/lib/auth-middleware";

const app = new Hono().get(
  "/overview",
  clerkMiddleware(),
  zValidator(
    "query",
    z.object({
      from: z.string().optional(),
      to: z.string().optional(),
      accountId: z.string().optional(),
    }),
  ),
  async (ctx) => {
    const auth = requireAuth(ctx);
    const { from, to, accountId } = ctx.req.valid("query");

    if (!auth.success) return auth.response;

    const userId = auth.userId;

    const { startDate, endDate } = parseDateRange(from, to);

    const periodLength = differenceInDays(endDate, startDate) + 1;
    const lastPeriodStart = subDays(startDate, periodLength);
    const lastPeriodEnd = subDays(endDate, periodLength);

    async function fetchFinancialData(startDate: Date, endDate: Date) {
      const [row] = await db
        .select({
          income: sql`
      SUM(
        CASE
          WHEN ${transactionTypes.name} = 'Income'
          THEN ${transactions.amount}
          ELSE 0
        END
      )
    `.mapWith(Number),
          expenses: sql`
      SUM(
        CASE
          WHEN ${transactionTypes.name} = 'Expense'
          THEN ABS(${transactions.amount})      
          WHEN ${transactionTypes.name} = 'Refund'
          THEN -ABS(${transactions.amount})      
          ELSE 0
        END
      )
    `.mapWith(Number),
        })
        .from(transactions)
        .innerJoin(
          transactionTypes,
          eq(transactions.transactionTypeId, transactionTypes.id),
        )
        .innerJoin(accounts, eq(transactions.accountId, accounts.id))
        .where(
          and(
            accountId ? eq(transactions.accountId, accountId) : undefined,
            eq(accounts.userId, userId),
            gte(transactions.date, startDate),
            lte(transactions.date, endDate),
          ),
        );

      return {
        income: row.income,
        expenses: row.expenses,
      };
    }

    const currentPeriod = await fetchFinancialData(startDate, endDate);

    const lastPeriod = await fetchFinancialData(lastPeriodStart, lastPeriodEnd);

    const incomeChangePtc = calculatePercentageChange(
      currentPeriod.income,
      lastPeriod.income,
    );

    const expensesChangePtc = calculatePercentageChange(
      currentPeriod.expenses,
      lastPeriod.expenses,
    );

    const [{ balance }] = await db
      .select({
        balance: sum(accounts.balance).mapWith(Number),
      })
      .from(accounts)
      .where(
        and(
          eq(accounts.userId, userId),
          accountId ? eq(accounts.id, accountId) : undefined,
        ),
      );

    const changeBalance =
      balance + currentPeriod.income - currentPeriod.expenses;
    const balanceChangePtc = calculatePercentageChange(balance, changeBalance);

    return ctx.json({
      data: {
        income: {
          amount: convertAmountFromMilliunits(currentPeriod.income),
          changeAmount: convertAmountFromMilliunits(
            currentPeriod.income - lastPeriod.income,
          ),
          changePtc: incomeChangePtc,
        },
        expenses: {
          amount: convertAmountFromMilliunits(currentPeriod.expenses),
          changeAmount:
            convertAmountFromMilliunits(
              currentPeriod.expenses - lastPeriod.expenses,
            ) * -1,
          changePtc: expensesChangePtc * -1,
        },
        balance: {
          amount: convertAmountFromMilliunits(balance),
          changeAmount: convertAmountFromMilliunits(changeBalance),
          changePtc: balanceChangePtc,
        },
      },
    });
  },
);

export default app;
