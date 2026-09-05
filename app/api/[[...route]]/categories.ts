import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import { insertCategorySchema } from "@/db/schema";
import {
  getCategories,
  getCategory,
} from "@/features/categories/server/category-read-operations";
import {
  createCategory,
  deleteCategories,
  deleteCategory,
  updateCategory,
} from "@/features/categories/server/category-write-operations";
import { API_ERRORS } from "@/lib/api-errors";
import { requireAuth } from "@/lib/auth-middleware";
import type { AppEnv } from "@/lib/hono-env";
import { requireId } from "@/lib/validation-middleware";

const app = new Hono<AppEnv>()
  .get("/", requireAuth, async (c) => {
    const userId = c.var.userId;
    const result = await getCategories(userId);

    if (!result.ok) {
      return c.json(API_ERRORS.BAD_REQUEST, 400);
    }

    return c.json({ data: result.data });
  })
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
      const userId = c.var.userId;
      const id = c.var.validatedId;

      const data = await getCategory(userId, id);

      if (!data) {
        return c.json(API_ERRORS.NOT_FOUND, 404);
      }

      return c.json({ data });
    },
  )
  .post(
    "/",
    requireAuth,
    zValidator(
      "json",
      insertCategorySchema.pick({
        name: true,
        parentId: true,
      }),
    ),
    async (c) => {
      const userId = c.var.userId;
      const values = c.req.valid("json");

      const result = await createCategory(userId, values);

      if (!result.ok) {
        return c.json(
          result.reason === "not_found"
            ? API_ERRORS.NOT_FOUND
            : API_ERRORS.BAD_REQUEST,
          result.reason === "not_found" ? 404 : 400,
        );
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
        ids: z.array(z.string()).min(1),
      }),
    ),
    async (c) => {
      const userId = c.var.userId;
      const values = c.req.valid("json");

      const result = await deleteCategories(userId, values.ids);

      if (!result.ok) {
        return c.json(
          result.reason === "not_found"
            ? API_ERRORS.NOT_FOUND
            : API_ERRORS.BAD_REQUEST,
          result.reason === "not_found" ? 404 : 400,
        );
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

      const result = await updateCategory(userId, id, values);

      if (!result.ok) {
        return c.json(
          result.reason === "not_found"
            ? API_ERRORS.NOT_FOUND
            : API_ERRORS.BAD_REQUEST,
          result.reason === "not_found" ? 404 : 400,
        );
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
      const userId = c.var.userId;
      const id = c.var.validatedId;

      const result = await deleteCategory(userId, id);

      if (!result.ok) {
        return c.json(
          result.reason === "not_found"
            ? API_ERRORS.NOT_FOUND
            : API_ERRORS.BAD_REQUEST,
          result.reason === "not_found" ? 404 : 400,
        );
      }

      return c.json({ data: result.data[0] });
    },
  );

export default app;
