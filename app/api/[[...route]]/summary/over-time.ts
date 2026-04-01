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
import type { AppEnv } from "@/lib/hono-env";
import { Day } from "@/lib/types";
import { convertAmountFromMilliunits, fillMissingDays } from "@/lib/utils";

const app = new Hono<AppEnv>().get(
  "/over-time",
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

    // Determine if we should extend the period to today for balance calculation
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

    // Fetch transactions for the REQUESTED period (for transactions chart)
    const requestedPeriod = await fetchFinancialData(
      userId,
      startDate,
      endDate,
      accountId,
    );

    // Calculate totals for requested period
    const totalIncomeMilli = requestedPeriod.reduce(
      (sum, d) => sum + (d.income || 0),
      0,
    );
    const totalExpensesMilli = requestedPeriod.reduce(
      (sum, d) => sum + (d.expenses || 0),
      0,
    );

    // Get balance at period start using effective end date (extends to today if needed)
    const balanceData = await calculateBalanceForPeriod(
      userId,
      startDate,
      effectiveEndDate,
      totalIncomeMilli,
      totalExpensesMilli,
      accountId,
    );

    // If we need to extend to today, fetch additional transactions
    let extendedPeriod = requestedPeriod;
    if (effectiveEndDate > endDate) {
      extendedPeriod = await fetchFinancialData(
        userId,
        startDate,
        effectiveEndDate,
        accountId,
      );
    }

    // Fill missing days for the EXTENDED period (for balance chart continuity)
    const days = fillMissingDays(extendedPeriod, startDate, effectiveEndDate);

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

    return c.json({
      data: buildDailyBalance(days, balanceData.balanceAtStartMilli),
    });
  },
);

export default app;
