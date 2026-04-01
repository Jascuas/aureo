import { clerkMiddleware } from "@hono/clerk-auth";
import { zValidator } from "@hono/zod-validator";
import { and, eq, gte, lte, sum } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { db } from "@/db/drizzle";
import { expenseOnlyAmountSql, incomeWithRefundAmountSql } from "@/db/helpers";
import { accounts, transactions, transactionTypes } from "@/db/schema";
import { requireAuth } from "@/lib/auth-middleware";
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
      accountId: z.string().optional(),
    }),
  ),
  async (c) => {
    const userId = c.var.userId;
    const { from, accountId } = c.req.valid("query");
    const { startDate } = parseDateRange(from);

    // Balance chart ALWAYS goes until today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch current balance (today)
    const [{ currentBalance }] = await db
      .select({
        currentBalance: sum(accounts.balance).mapWith(Number),
      })
      .from(accounts)
      .where(
        and(
          eq(accounts.userId, userId),
          accountId ? eq(accounts.id, accountId) : undefined,
        ),
      );

    // Fetch transactions from startDate to today
    const financialData = await db
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
          lte(transactions.date, today),
        ),
      )
      .groupBy(transactions.date)
      .orderBy(transactions.date);

    // Fill missing days from startDate to today
    const days = fillMissingDays(financialData, startDate, today);

    // Calculate totals for balance calculation
    const totalIncome = financialData.reduce(
      (sum, d) => sum + (d.income || 0),
      0,
    );
    const totalExpenses = financialData.reduce(
      (sum, d) => sum + (d.expenses || 0),
      0,
    );

    // Calculate balance at start of period
    const balanceAtStart = currentBalance - (totalIncome - totalExpenses);

    const buildDailyBalance = (days: Day[], openingBalanceMilli: number) => {
      let runningMilli = openingBalanceMilli;

      return days.map((d) => {
        // Keep everything in milliunits to avoid rounding errors
        const netMilli = (d.income ?? 0) - (d.expenses ?? 0);
        runningMilli += netMilli;

        return {
          date: d.date,
          income: convertAmountFromMilliunits(d.income ?? 0),
          expenses: convertAmountFromMilliunits(d.expenses ?? 0),
          balance: convertAmountFromMilliunits(runningMilli),
        };
      });
    };

    const dailyBalance = buildDailyBalance(days, balanceAtStart);

    return c.json({
      data: dailyBalance,
    });
  },
);

export default app;
