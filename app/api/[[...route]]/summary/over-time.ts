import { clerkMiddleware, getAuth } from "@hono/clerk-auth";
import { zValidator } from "@hono/zod-validator";
import { parse, subDays } from "date-fns";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { db } from "@/db/drizzle";
import { accounts, transactions, transactionTypes } from "@/db/schema";
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
    const auth = getAuth(ctx);
    const { from, to } = ctx.req.valid("query");

    if (!auth?.userId) return ctx.json({ error: "Unauthorized." }, 401);

    const defaultTo = new Date();
    const defaultFrom = subDays(defaultTo, 30);

    const startDate = from
      ? parse(from, "yyyy-MM-dd", new Date())
      : defaultFrom;
    const endDate = to ? parse(to, "yyyy-MM-dd", new Date()) : defaultTo;

    async function fetchFinancialData(
      userId: string,
      startDate: Date,
      endDate: Date,
      accountId?: string,
    ) {
      const row = await db
        .select({
          date: transactions.date,
          income: sql`
      SUM(
        CASE
          WHEN ${transactionTypes.name} = 'Income'
          THEN ${transactions.amount}
          WHEN ${transactionTypes.name} = 'Refund'
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
        )
        .groupBy(transactions.date)
        .orderBy(transactions.date);

      return row;
    }

    const currentPeriod = await fetchFinancialData(
      auth.userId,
      startDate,
      endDate,
    );

    const days = fillMissingDays(currentPeriod, startDate, endDate);

    return ctx.json({
      data: days.map((day) => ({
        ...day,
        income: convertAmountFromMilliunits(day.income),
        expenses: convertAmountFromMilliunits(day.expenses),
      })),
    });
  },
);

export default app;
