import { zValidator } from "@hono/zod-validator";
import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { db } from "@/db/drizzle";
import { categoryAmountSql } from "@/db/helpers";
import { accounts, transactions } from "@/db/schema";
import {
  getSummaryTransactionTypeIds,
  TRANSACTION_TYPE_NAMES,
} from "@/features/transaction-types/lib/transaction-types";
import { requireAuth } from "@/lib/auth-middleware";
import { parseDateRange } from "@/lib/date-utils";
import type { AppEnv } from "@/lib/hono-env";

const app = new Hono<AppEnv>().get(
  "/by-payee",
  requireAuth,
  zValidator(
    "query",
    z.object({
      type: z.enum(TRANSACTION_TYPE_NAMES).default("Expense"),
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

    const wanted = getSummaryTransactionTypeIds(type);

    const rows = await db
      .select({
        name: transactions.payee,
        value: sql`ROUND(SUM(${categoryAmountSql}) / 1000)`.mapWith(
          Number,
        ),
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))

      .where(
        and(
          accountId ? eq(transactions.accountId, accountId) : undefined,
          eq(accounts.userId, userId),
          inArray(transactions.transactionTypeId, wanted),
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
