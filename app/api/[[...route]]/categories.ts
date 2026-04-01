import { clerkMiddleware } from "@hono/clerk-auth";
import { zValidator } from "@hono/zod-validator";
import { createId } from "@paralleldrive/cuid2";
import { and, eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { Hono } from "hono";
import { z } from "zod";

import { db } from "@/db/drizzle";
import { categories, insertCategorySchema } from "@/db/schema";
import { API_ERRORS } from "@/lib/api-errors";
import { requireAuth } from "@/lib/auth-middleware";
import type { AppEnv } from "@/lib/hono-env";
import { requireId } from "@/lib/validation-middleware";

const parentCategory = alias(categories, "parent");

const app = new Hono<AppEnv>()
  .get("/", clerkMiddleware(), requireAuth, async (c) => {
    const userId = c.var.userId;

    const data = await db
      .select({
        id: categories.id,
        name: categories.name,
        parentId: categories.parentId,
        parentName: parentCategory.name,
      })
      .from(categories)
      .leftJoin(parentCategory, eq(categories.parentId, parentCategory.id))
      .where(eq(categories.userId, userId));

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
    requireId,
    async (c) => {
      const userId = c.var.userId;
      const id = c.var.validatedId;

      const [data] = await db
        .select({
          id: categories.id,
          name: categories.name,
          parentName: parentCategory.name,
          parentId: categories.parentId,
        })
        .from(categories)
        .leftJoin(parentCategory, eq(categories.parentId, parentCategory.id))
        .where(and(eq(categories.userId, userId), eq(categories.id, id)));

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
      insertCategorySchema.pick({
        name: true,
      }),
    ),
    async (c) => {
      const userId = c.var.userId;
      const values = c.req.valid("json");

      const [data] = await db
        .insert(categories)
        .values({
          id: createId(),
          userId,
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
        .delete(categories)
        .where(
          and(
            eq(categories.userId, userId),
            inArray(categories.id, values.ids),
          ),
        )
        .returning({
          id: categories.id,
        });

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
      insertCategorySchema.pick({
        name: true,
        parentId: true,
      }),
    ),
    async (c) => {
      const userId = c.var.userId;
      const id = c.var.validatedId;
      const values = c.req.valid("json");

      const [data] = await db
        .update(categories)
        .set(values)
        .where(and(eq(categories.userId, userId), eq(categories.id, id)))
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

      const [data] = await db
        .delete(categories)
        .where(and(eq(categories.userId, userId), eq(categories.id, id)))
        .returning({
          id: categories.id,
        });

      if (!data) {
        return c.json(API_ERRORS.NOT_FOUND, 404);
      }

      return c.json({ data });
    },
  );

export default app;
