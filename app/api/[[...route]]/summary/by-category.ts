import { zValidator } from "@hono/zod-validator";
import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { db } from "@/db/drizzle";
import { categoryAmountSql } from "@/db/helpers";
import { accounts, categories, transactions } from "@/db/schema";
import {
  getSummaryTransactionTypeIds,
  TRANSACTION_TYPE_NAMES,
} from "@/features/transaction-types/lib/transaction-types";
import { requireAuth } from "@/lib/auth-middleware";
import { parseDateRange } from "@/lib/date-utils";
import type { AppEnv } from "@/lib/hono-env";
import { convertAmountFromMilliunits } from "@/lib/utils";

const app = new Hono<AppEnv>().get(
  "/by-category",
  requireAuth,
  zValidator(
    "query",
    z.object({
      type: z.enum([...TRANSACTION_TYPE_NAMES, "All"]).default("All"),
      from: z.string().optional(),
      to: z.string().optional(),
      accountId: z.string().optional(),
      top: z.coerce.number().int().positive().max(20).default(3),
    }),
  ),
  async (c) => {
    const userId = c.var.userId;
    const { type, from, to, accountId, top } = c.req.valid("query");
    const { startDate, endDate } = parseDateRange(from, to);

    const wanted = getSummaryTransactionTypeIds(type);

    const rows = await db
      .select({
        name: categories.name,
        valueMilliunits: sql`SUM(${categoryAmountSql})`.mapWith(
          Number,
        ),
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .innerJoin(categories, eq(transactions.categoryId, categories.id))

      .where(
        and(
          accountId ? eq(transactions.accountId, accountId) : undefined,
          eq(accounts.userId, userId),
          inArray(transactions.transactionTypeId, wanted),
          gte(transactions.date, startDate),
          lte(transactions.date, endDate),
        ),
      )
      .groupBy(categories.name)
      .orderBy(desc(sql`SUM(${categoryAmountSql})`));

    const topRows = rows.slice(0, top);
    const rest = rows.slice(top);
    const restSumMilliunits = rest.reduce(
      (total, row) => total + row.valueMilliunits,
      0,
    );
    const finalCategories =
      rest.length > 0
        ? [...topRows, { name: "Other", valueMilliunits: restSumMilliunits }]
        : topRows;

    return c.json({
      data: finalCategories.map(({ valueMilliunits, ...category }) => ({
        ...category,
        value: convertAmountFromMilliunits(valueMilliunits),
      })),
    });
  },
);

export default app;
