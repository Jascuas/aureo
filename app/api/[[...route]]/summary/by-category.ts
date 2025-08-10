import { clerkMiddleware, getAuth } from "@hono/clerk-auth";
import { zValidator } from "@hono/zod-validator";
import { parse, subDays } from "date-fns";
import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { db } from "@/db/drizzle";
import {
  accounts,
  categories,
  transactions,
  transactionTypes,
} from "@/db/schema";
type TxType = "Income" | "Expense" | "Refund";

const app = new Hono().get(
  "/by-category",
  clerkMiddleware(),
  zValidator(
    "query",
    z.object({
      type: z.enum(["Income", "Expense", "Refund"]).default("Expense"),
      from: z.string().optional(),
      to: z.string().optional(),
      accountId: z.string().optional(),
      top: z.coerce.number().int().positive().max(20).default(3),
    }),
  ),
  async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) return c.json({ error: "Unauthorized." }, 401);

    const { type, from, to, accountId, top } = c.req.valid("query");
    console.log("TOPPPPP", top);
    const defaultTo = new Date();
    const defaultFrom = subDays(defaultTo, 30);
    const startDate = from
      ? parse(from, "yyyy-MM-dd", new Date())
      : defaultFrom;
    const endDate = to ? parse(to, "yyyy-MM-dd", new Date()) : defaultTo;
    const wanted: readonly TxType[] =
      type === "Expense" ? ["Expense", "Refund"] : [type];

    const amountExpr = sql`
    CASE
      WHEN ${transactionTypes.name} = 'Expense' THEN ABS(${transactions.amount})
      WHEN ${transactionTypes.name} = 'Refund'  THEN -ABS(${transactions.amount})
      ELSE ABS(${transactions.amount})
    END
  `;

    const rows = await db
      .select({
        name: categories.name,
        value: sql`ROUND(SUM(ABS(${transactions.amount})) / 1000)`.mapWith(
          Number,
        ),
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .innerJoin(
        transactionTypes,
        eq(transactions.transactionTypeId, transactionTypes.id),
      )
      .where(
        and(
          accountId ? eq(transactions.accountId, accountId) : undefined,
          eq(accounts.userId, auth.userId),
          inArray(transactionTypes.name, wanted),
          gte(transactions.date, startDate),
          lte(transactions.date, endDate),
        ),
      )
      .groupBy(categories.name)
      .orderBy(desc(sql`SUM(${amountExpr})`));

    const topRows = rows.slice(0, top);
    const rest = rows.slice(top);
    const restSum = rest.reduce((acc, r) => acc + r.value, 0);
    const finalCategories =
      rest.length > 0
        ? [...topRows, { name: "Other", value: restSum }]
        : topRows;

    return c.json({
      data: finalCategories,
    });
  },
);

export default app;
