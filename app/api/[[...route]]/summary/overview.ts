import { clerkMiddleware, getAuth } from "@hono/clerk-auth";
import { zValidator } from "@hono/zod-validator";
import { differenceInDays, parse, subDays } from "date-fns";
import { and, eq, gte, lte, sql, sum } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { db } from "@/db/drizzle";
import { accounts, transactions, transactionTypes } from "@/db/schema";
import {
  calculatePercentageChange,
  convertAmountFromMilliunits,
  formatDateRange,
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
    const auth = getAuth(ctx);
    const { from, to, accountId } = ctx.req.valid("query");

    if (!auth?.userId) return ctx.json({ error: "Unauthorized." }, 401);

    const defaultTo = new Date();
    const defaultFrom = subDays(defaultTo, 30);

    const startDate = from
      ? parse(from, "yyyy-MM-dd", new Date())
      : defaultFrom;
    const endDate = to ? parse(to, "yyyy-MM-dd", new Date()) : defaultTo;

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
            eq(accounts.userId, auth?.userId ?? ""),
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
          eq(accounts.userId, auth.userId),
          accountId ? eq(accounts.id, accountId) : undefined,
        ),
      );

    const [{ delta }] = await db
      .select({ delta: sum(transactions.amount).mapWith(Number) })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(
        and(
          eq(accounts.userId, auth.userId),
          gte(transactions.date, new Date(startDate)),
          lte(transactions.date, new Date()),
          accountId ? eq(transactions.accountId, accountId) : undefined,
        ),
      );

    const startBalance = balance - (delta ?? 0);
    const changeBalance = balance - startBalance;
    const balanceChangePtc = calculatePercentageChange(
      changeBalance,
      startBalance,
    );

    return ctx.json({
      data: {
        lastPeriod: formatDateRange({
          to: lastPeriodEnd,
          from: lastPeriodStart,
        }),
        lastPeriodBalance: formatDateRange({ to: defaultTo, from }),
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
