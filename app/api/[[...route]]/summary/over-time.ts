import { clerkMiddleware } from "@hono/clerk-auth";
import { zValidator } from "@hono/zod-validator";
import { and, eq, gte, lte, sum } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { db } from "@/db/drizzle";
import { accounts, transactions, transactionTypes } from "@/db/schema";
import { expenseOnlyAmountSql, incomeWithRefundAmountSql } from "@/db/helpers";
import { parseDateRange } from "@/lib/date-utils";
import { Day } from "@/lib/types";
import { convertAmountFromMilliunits, fillMissingDays } from "@/lib/utils";
import { requireAuth } from "@/lib/auth-middleware";

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

    const currentPeriod = await fetchFinancialData(userId, startDate, endDate);

    const days = fillMissingDays(currentPeriod, startDate, endDate);

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
      data: buildDailyBalance(days, balance),
    });
  },
);

export default app;
