import { clerkMiddleware } from "@hono/clerk-auth";
import { zValidator } from "@hono/zod-validator";
import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { db } from "@/db/drizzle";
import { categoryAmountSql } from "@/db/helpers";
import {
  accounts,
  categories,
  transactions,
  transactionTypes,
} from "@/db/schema";
import { requireAuth } from "@/lib/auth-middleware";
import { parseDateRange } from "@/lib/date-utils";

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
    const userId = requireAuth(c);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { type, from, to, accountId, top } = c.req.valid("query");
    const { startDate, endDate } = parseDateRange(from, to);

    const wanted: readonly TxType[] =
      type === "Expense" ? ["Expense", "Refund"] : [type];

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
          eq(accounts.userId, userId),
          inArray(transactionTypes.name, wanted),
          gte(transactions.date, startDate),
          lte(transactions.date, endDate),
        ),
      )
      .groupBy(categories.name)
      .orderBy(desc(sql`SUM(${categoryAmountSql})`));

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
