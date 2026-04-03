import { clerkMiddleware } from "@hono/clerk-auth";
import { zValidator } from "@hono/zod-validator";
import { createId } from "@paralleldrive/cuid2";
import { and, desc, eq, gt, gte, inArray, lt, lte, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { db } from "@/db/drizzle";
import {
  accounts,
  categories,
  insertTransactionSchema,
  transactions,
} from "@/db/schema";
import { API_ERRORS } from "@/lib/api-errors";
import { requireAuth } from "@/lib/auth-middleware";
import { parseDateRange } from "@/lib/date-utils";
import type { AppEnv } from "@/lib/hono-env";
import { requireId } from "@/lib/validation-middleware";

const app = new Hono<AppEnv>()
  .get(
    "/",
    zValidator(
      "query",
      z.object({
        from: z.string().optional(),
        to: z.string().optional(),
        accountId: z.string().optional(),
        cursor: z.string().optional(),
        limit: z.coerce.number().min(1).max(100).default(50),
      }),
    ),
    clerkMiddleware(),
    requireAuth,
    async (c) => {
      const userId = c.var.userId;
      const { from, to, accountId, cursor, limit } = c.req.valid("query");
      const { startDate, endDate } = parseDateRange(from, to);

      // Parse cursor if provided
      const parsedCursor = cursor
        ? (JSON.parse(cursor) as { date: string; id: string })
        : null;

      // Fetch one extra record to determine if there are more pages
      const data = await db
        .select({
          id: transactions.id,
          date: transactions.date,
          category: categories.name,
          categoryId: transactions.categoryId,
          payee: transactions.payee,
          amount: transactions.amount,
          notes: transactions.notes,
          account: accounts.name,
          accountId: transactions.accountId,
        })
        .from(transactions)
        .innerJoin(accounts, eq(transactions.accountId, accounts.id))
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(
          and(
            accountId ? eq(transactions.accountId, accountId) : undefined,
            eq(accounts.userId, userId),
            gte(transactions.date, startDate),
            lte(transactions.date, endDate),
            // Cursor pagination logic
            parsedCursor
              ? or(
                  lt(transactions.date, new Date(parsedCursor.date)),
                  and(
                    eq(transactions.date, new Date(parsedCursor.date)),
                    gt(transactions.id, parsedCursor.id),
                  ),
                )
              : undefined,
          ),
        )
        .orderBy(desc(transactions.date), desc(transactions.id))
        .limit(limit + 1);

      // Determine if there are more pages
      const hasMore = data.length > limit;
      const items = hasMore ? data.slice(0, limit) : data;

      // Generate next cursor if there are more pages
      const nextCursor = hasMore
        ? JSON.stringify({
            date: items[items.length - 1].date.toISOString(),
            id: items[items.length - 1].id,
          })
        : null;

      return c.json({ data: items, nextCursor, hasMore });
    },
  )
  .get(
    "/:id",
    zValidator(
      "param",
      z.object({
        id: z.string().optional(),
      }),
    ),
    clerkMiddleware(),
    requireAuth,
    requireId,
    async (c) => {
      const userId = c.var.userId;
      const id = c.var.validatedId;

      const [data] = await db
        .select({
          id: transactions.id,
          date: transactions.date,
          categoryId: transactions.categoryId,
          payee: transactions.payee,
          amount: transactions.amount,
          notes: transactions.notes,
          accountId: transactions.accountId,
          transactionTypeId: transactions.transactionTypeId,
        })
        .from(transactions)
        .innerJoin(accounts, eq(transactions.accountId, accounts.id))
        .where(and(eq(transactions.id, id), eq(accounts.userId, userId)));

      if (!data) {
        return c.json(API_ERRORS.NOT_FOUND, 404);
      }

      return c.json({ data });
    },
  )
  .post(
    "/",
    clerkMiddleware(),
    requireAuth,
    zValidator(
      "json",
      insertTransactionSchema.omit({
        id: true,
      }),
    ),
    async (c) => {
      const _userId = c.var.userId;
      const values = c.req.valid("json");

      const [data] = await db
        .insert(transactions)
        .values({
          id: createId(),
          ...values,
        })
        .returning();

      return c.json({ data });
    },
  )
  .post(
    "/bulk-delete",
    clerkMiddleware(),
    requireAuth,
    zValidator(
      "json",
      z.object({
        ids: z.array(z.string()),
      }),
    ),
    async (c) => {
      const userId = c.var.userId;
      const values = c.req.valid("json");

      const transactionsToDelete = db.$with("transactions_to_delete").as(
        db
          .select({ id: transactions.id })
          .from(transactions)
          .innerJoin(accounts, eq(transactions.accountId, accounts.id))
          .where(
            and(
              inArray(transactions.id, values.ids),
              eq(accounts.userId, userId),
            ),
          ),
      );

      const data = await db
        .with(transactionsToDelete)
        .delete(transactions)
        .where(
          inArray(
            transactions.id,
            sql`(select id from ${transactionsToDelete})`,
          ),
        )
        .returning({
          id: transactions.id,
        });

      return c.json({ data });
    },
  )
  .post(
    "/bulk-create",
    clerkMiddleware(),
    requireAuth,
    zValidator("json", z.array(insertTransactionSchema.omit({ id: true }))),
    async (c) => {
      const _userId = c.var.userId;
      const values = c.req.valid("json");

      const data = await db
        .insert(transactions)
        .values(
          values.map((value) => ({
            id: createId(),
            ...value,
          })),
        )
        .returning();

      return c.json({ data });
    },
  )
  .patch(
    "/:id",
    zValidator(
      "param",
      z.object({
        id: z.string().optional(),
      }),
    ),
    clerkMiddleware(),
    requireAuth,
    requireId,
    zValidator(
      "json",
      insertTransactionSchema.omit({
        id: true,
      }),
    ),
    async (c) => {
      const userId = c.var.userId;
      const id = c.var.validatedId;
      const values = c.req.valid("json");

      const transactionsToUpdate = db.$with("transactions_to_update").as(
        db
          .select({ id: transactions.id })
          .from(transactions)
          .innerJoin(accounts, eq(transactions.accountId, accounts.id))
          .where(and(eq(transactions.id, id), eq(accounts.userId, userId))),
      );

      const [data] = await db
        .with(transactionsToUpdate)
        .update(transactions)
        .set(values)
        .where(
          inArray(
            transactions.id,
            sql`(select id from ${transactionsToUpdate})`,
          ),
        )
        .returning();

      if (!data) {
        return c.json(API_ERRORS.NOT_FOUND, 404);
      }

      return c.json({ data });
    },
  )
  .delete(
    "/:id",
    zValidator(
      "param",
      z.object({
        id: z.string().optional(),
      }),
    ),
    clerkMiddleware(),
    requireAuth,
    requireId,
    async (c) => {
      const userId = c.var.userId;
      const id = c.var.validatedId;

      const transactionsToDelete = db.$with("transactions_to_delete").as(
        db
          .select({ id: transactions.id })
          .from(transactions)
          .innerJoin(accounts, eq(transactions.accountId, accounts.id))
          .where(and(eq(transactions.id, id), eq(accounts.userId, userId))),
      );

      const [data] = await db
        .with(transactionsToDelete)
        .delete(transactions)
        .where(
          inArray(
            transactions.id,
            sql`(select id from ${transactionsToDelete})`,
          ),
        )
        .returning({
          id: transactions.id,
        });

      if (!data) {
        return c.json(API_ERRORS.NOT_FOUND, 404);
      }

      return c.json({ data });
    },
  );

export default app;
