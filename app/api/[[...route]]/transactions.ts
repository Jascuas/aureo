import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import { insertTransactionSchema } from "@/db/schema";
import {
  TRANSACTION_BULK_LIMIT,
  transactionIdsSchema,
  transactionListQuerySchema,
} from "@/features/transactions/lib/transaction-list-input";
import {
  getTransaction,
  listTransactions,
} from "@/features/transactions/server/transaction-list-operations";
import {
  createTransaction,
  createTransactions,
  deleteTransaction,
  deleteTransactions,
  updateTransaction,
} from "@/features/transactions/server/transaction-write-operations";
import { API_ERRORS } from "@/lib/api-errors";
import { requireAuth } from "@/lib/auth-middleware";
import type { AppEnv } from "@/lib/hono-env";
import { requireId } from "@/lib/validation-middleware";

const transactionValuesSchema = insertTransactionSchema.omit({ id: true });

const app = new Hono<AppEnv>()
  .get(
    "/",
    zValidator("query", transactionListQuerySchema, (result, c) => {
      if (!result.success) {
        return c.json(API_ERRORS.BAD_REQUEST, 400);
      }
    }),
    requireAuth,
    async (c) => {
      const data = await listTransactions(c.var.userId, c.req.valid("query"));

      return c.json(data);
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
    requireAuth,
    requireId,
    async (c) => {
      const data = await getTransaction(c.var.userId, c.var.validatedId);

      if (!data) {
        return c.json(API_ERRORS.NOT_FOUND, 404);
      }

      return c.json({ data });
    },
  )
  .post(
    "/",
    requireAuth,
    zValidator("json", transactionValuesSchema),
    async (c) => {
      const result = await createTransaction(c.var.userId, c.req.valid("json"));

      if (!result.ok) {
        return c.json(API_ERRORS.NOT_FOUND, 404);
      }

      return c.json({ data: result.data });
    },
  )
  .post(
    "/bulk-delete",
    requireAuth,
    zValidator(
      "json",
      z.object({
        ids: transactionIdsSchema,
      }),
    ),
    async (c) => {
      const data = await deleteTransactions(c.var.userId, c.req.valid("json").ids);

      return c.json({ data });
    },
  )
  .post(
    "/bulk-create",
    requireAuth,
    zValidator("json", z.array(transactionValuesSchema).min(1).max(TRANSACTION_BULK_LIMIT)),
    async (c) => {
      const result = await createTransactions(c.var.userId, c.req.valid("json"));

      if (!result.ok) {
        return c.json(API_ERRORS.NOT_FOUND, 404);
      }

      return c.json({ data: result.data });
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
    requireAuth,
    requireId,
    zValidator("json", transactionValuesSchema),
    async (c) => {
      const result = await updateTransaction(
        c.var.userId,
        c.var.validatedId,
        c.req.valid("json"),
      );

      if (!result.ok) {
        return c.json(API_ERRORS.NOT_FOUND, 404);
      }

      return c.json({ data: result.data });
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
    requireAuth,
    requireId,
    async (c) => {
      const result = await deleteTransaction(c.var.userId, c.var.validatedId);

      if (!result.ok) {
        return c.json(API_ERRORS.NOT_FOUND, 404);
      }

      return c.json({ data: result.data });
    },
  );

export default app;
