import { clerkMiddleware } from "@hono/clerk-auth";
import { zValidator } from "@hono/zod-validator";
import { and, eq, gte, lte } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { db } from "@/db/drizzle";
import { expenseOnlyAmountSql, incomeWithRefundAmountSql } from "@/db/helpers";
import { accounts, transactions, transactionTypes } from "@/db/schema";
import { requireAuth } from "@/lib/auth-middleware";
import { calculateBalanceForPeriod } from "@/lib/balance-utils";
import { parseDateRange } from "@/lib/date-utils";
import { Day } from "@/lib/types";
import { convertAmountFromMilliunits, fillMissingDays } from "@/lib/utils";

const app = new Hono().get(
  "/over-time",
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

    // For balance chart: extend to today if period is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const effectiveEndDate = today > endDate ? today : endDate;

    async function fetchFinancialData(
      userId: string,
      startDate: Date,
      endDate: Date,
      accountId?: string,
    ) {
      const row = await db
        .select({
          date: transactions.date,
          income: incomeWithRefundAmountSql,
          expenses: expenseOnlyAmountSql,
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
        )
        .groupBy(transactions.date)
        .orderBy(transactions.date);

      return row;
    }

    const currentPeriod = await fetchFinancialData(
      userId,
      startDate,
      effectiveEndDate,
      accountId,
    );

    const days = fillMissingDays(currentPeriod, startDate, effectiveEndDate);

    // Calculate total income and expenses for the period
    const totalIncomeMilli = currentPeriod.reduce(
      (sum, d) => sum + (d.income || 0),
      0,
    );
    const totalExpensesMilli = currentPeriod.reduce(
      (sum, d) => sum + (d.expenses || 0),
      0,
    );

    // Get balance at period start using shared utility
    const balanceData = await calculateBalanceForPeriod(
      userId,
      startDate,
      effectiveEndDate,
      totalIncomeMilli,
      totalExpensesMilli,
      accountId,
    );

    const buildDailyBalance = (days: Day[], openingBalanceMilli: number) => {
      let running = convertAmountFromMilliunits(openingBalanceMilli);
      return days.map((d) => {
        const net = (d.income ?? 0) - (d.expenses ?? 0);
        running += net;
        return {
          ...d,
          balance: running,
        };
      });
    };

    return ctx.json({
      data: buildDailyBalance(days, balanceData.balanceAtStartMilli),
    });
  },
);

export default app;
