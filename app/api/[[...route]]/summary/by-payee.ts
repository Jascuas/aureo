import { clerkMiddleware } from "@hono/clerk-auth";
import { zValidator } from "@hono/zod-validator";
import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { db } from "@/db/drizzle";
import { categoryAmountSql } from "@/db/helpers";
import { accounts, transactions, transactionTypes } from "@/db/schema";
import { requireAuth } from "@/lib/auth-middleware";
import { parseDateRange } from "@/lib/date-utils";
import type { AppEnv } from "@/lib/hono-env";

type TxType = "Income" | "Expense" | "Refund";

const app = new Hono<AppEnv>().get(
  "/by-payee",
  clerkMiddleware(),
  requireAuth,
  zValidator(
    "query",
    z.object({
      type: z.enum(["Income", "Expense", "Refund"]).default("Expense"),
      from: z.string().optional(),
      to: z.string().optional(),
      accountId: z.string().optional(),
      top: z.coerce.number().int().positive().max(50).default(10),
    }),
  ),
  async (c) => {
    const userId = c.var.userId;
    const { type, from, to, accountId, top } = c.req.valid("query");
    const { startDate, endDate } = parseDateRange(from, to);

    const wanted: readonly TxType[] =
      type === "Expense" ? ["Expense", "Refund"] : [type];

    const rows = await db
      .select({
        name: transactions.payee,
        value: sql`ROUND(SUM(ABS(${transactions.amount})) / 1000)`.mapWith(
          Number,
        ),
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
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
      .groupBy(transactions.payee)
      .orderBy(desc(sql`SUM(${categoryAmountSql})`))
      .limit(top);

    return c.json({ data: rows });
  },
);

export default app;
