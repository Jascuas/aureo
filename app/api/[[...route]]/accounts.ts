import { clerkMiddleware } from "@hono/clerk-auth";
import { zValidator } from "@hono/zod-validator";
import { createId } from "@paralleldrive/cuid2";
import { and, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { db } from "@/db/drizzle";
import { accounts, insertAccountSchema } from "@/db/schema";
import { API_ERRORS } from "@/lib/api-errors";
import { requireAuth } from "@/lib/auth-middleware";
import type { AppEnv } from "@/lib/hono-env";

const app = new Hono<AppEnv>()
  .get("/", clerkMiddleware(), requireAuth, async (c) => {
    const userId = c.var.userId;

    const data = await db
      .select({
        id: accounts.id,
        name: accounts.name,
      })
      .from(accounts)
      .where(eq(accounts.userId, userId));

    return c.json({ data });
  })
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
    async (c) => {
      const userId = c.var.userId;
      const { id } = c.req.valid("param");

      if (!id) {
        return c.json(API_ERRORS.MISSING_ID, 400);
      }

      const [data] = await db
        .select({
          id: accounts.id,
          name: accounts.name,
        })
        .from(accounts)
        .where(and(eq(accounts.userId, userId), eq(accounts.id, id)));

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
      insertAccountSchema.pick({
        name: true,
      }),
    ),
    async (c) => {
      const userId = c.var.userId;
      const values = c.req.valid("json");

      const [data] = await db
        .insert(accounts)
        .values({
          id: createId(),
          userId,
          balance: 0,
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

      const data = await db
        .delete(accounts)
        .where(
          and(eq(accounts.userId, userId), inArray(accounts.id, values.ids)),
        )
        .returning({
          id: accounts.id,
        });

      return c.json({ data });
    },
  )
  .patch(
    "/:id",
    clerkMiddleware(),
    requireAuth,
    zValidator(
      "param",
      z.object({
        id: z.string().optional(),
      }),
    ),
    zValidator(
      "json",
      insertAccountSchema.pick({
        name: true,
      }),
    ),
    async (c) => {
      const userId = c.var.userId;
      const { id } = c.req.valid("param");
      const values = c.req.valid("json");

      if (!id) {
        return c.json(API_ERRORS.MISSING_ID, 400);
      }

      const [data] = await db
        .update(accounts)
        .set(values)
        .where(and(eq(accounts.userId, userId), eq(accounts.id, id)))
        .returning();

      if (!data) {
        return c.json(API_ERRORS.NOT_FOUND, 404);
      }

      return c.json({ data });
    },
  )
  .delete(
    "/:id",
    clerkMiddleware(),
    requireAuth,
    zValidator(
      "param",
      z.object({
        id: z.string().optional(),
      }),
    ),
    async (c) => {
      const userId = c.var.userId;
      const { id } = c.req.valid("param");

      if (!id) {
        return c.json(API_ERRORS.MISSING_ID, 400);
      }

      const [data] = await db
        .delete(accounts)
        .where(and(eq(accounts.userId, userId), eq(accounts.id, id)))
        .returning({
          id: accounts.id,
        });

      if (!data) {
        return c.json(API_ERRORS.NOT_FOUND, 404);
      }

      return c.json({ data });
    },
  );

export default app;
