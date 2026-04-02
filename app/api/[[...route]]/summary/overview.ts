import { clerkMiddleware } from "@hono/clerk-auth";
import { zValidator } from "@hono/zod-validator";
import { differenceInDays, subDays } from "date-fns";
import { and, eq, gte, lte } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { db } from "@/db/drizzle";
import { expensesAmountSql, incomeAmountSql } from "@/db/helpers";
import { accounts, transactions, transactionTypes } from "@/db/schema";
import { requireAuth } from "@/lib/auth-middleware";
import { calculateCurrentBalanceChange } from "@/lib/balance-utils";
import { parseDateRange } from "@/lib/date-utils";
import type { AppEnv } from "@/lib/hono-env";
import {
  calculatePercentageChange,
  convertAmountFromMilliunits,
} from "@/lib/utils";

const app = new Hono<AppEnv>().get(
  "/overview",
  clerkMiddleware(),
  requireAuth,
  zValidator(
    "query",
    z.object({
      from: z.string().optional(),
      to: z.string().optional(),
      accountId: z.string().optional(),
    }),
  ),
  async (c) => {
    const userId = c.var.userId;
    const { from, to, accountId } = c.req.valid("query");
    const { startDate, endDate } = parseDateRange(from, to);

    const periodLength = differenceInDays(endDate, startDate) + 1;
    const lastPeriodStart = subDays(startDate, periodLength);
    const lastPeriodEnd = subDays(endDate, periodLength);

    async function fetchFinancialData(
      userId: string,
      startDate: Date,
      endDate: Date,
    ) {
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

    const currentPeriod = await fetchFinancialData(userId, startDate, endDate);
    const lastPeriod = await fetchFinancialData(
      userId,
      lastPeriodStart,
      lastPeriodEnd,
    );

    const incomeChangePtc = calculatePercentageChange(
      currentPeriod.income,
      lastPeriod.income,
    );

    const expensesChangePtc = calculatePercentageChange(
      currentPeriod.expenses,
      lastPeriod.expenses,
    );

    // Calculate balance: current balance + change since period start
    const balanceData = await calculateCurrentBalanceChange(
      userId,
      startDate, // Only period start matters for balance
      accountId,
    );

    const balanceChangePtc = calculatePercentageChange(
      balanceData.currentBalanceMilli,
      balanceData.balanceAtSinceDateMilli,
    );

    return c.json({
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
          amount: convertAmountFromMilliunits(balanceData.currentBalanceMilli),
          changeAmount: convertAmountFromMilliunits(balanceData.changeMilli),
          changePtc: balanceChangePtc,
        },
      },
    });
  },
);

export default app;
