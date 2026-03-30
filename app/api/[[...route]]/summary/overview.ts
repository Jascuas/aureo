import { clerkMiddleware } from "@hono/clerk-auth";
import { zValidator } from "@hono/zod-validator";
import { differenceInDays, subDays } from "date-fns";
import { and, eq, gte, lte } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { db } from "@/db/drizzle";
import { accounts, transactions, transactionTypes } from "@/db/schema";
import { expensesAmountSql, incomeAmountSql } from "@/db/helpers";
import { requireAuth } from "@/lib/auth-middleware";
import { calculateBalanceForPeriod } from "@/lib/balance-utils";
import { parseDateRange } from "@/lib/date-utils";
import {
  calculatePercentageChange,
  convertAmountFromMilliunits,
} from "@/lib/utils";

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
          income: incomeAmountSql,
          expenses: expensesAmountSql,
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

    // Calculate balance using shared utility
    const balanceData = await calculateBalanceForPeriod(
      userId,
      startDate,
      endDate,
      currentPeriod.income,
      currentPeriod.expenses,
      accountId,
    );

    const balanceChangePtc = calculatePercentageChange(
      balanceData.balanceAtStartMilli,
      balanceData.balanceAtEndMilli,
    );

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
          amount: convertAmountFromMilliunits(balanceData.balanceAtEndMilli),
          changeAmount: convertAmountFromMilliunits(balanceData.netChangeMilli),
          changePtc: balanceChangePtc,
        },
      },
    });
  },
);

export default app;
