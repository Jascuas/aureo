import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import { accountFormSchema } from "@/features/accounts/lib/account-form-schema";
import {
  createAccount,
  deleteAccount,
  deleteAccounts,
  getAccount,
  listAccounts,
  updateAccount,
} from "@/features/accounts/server/account-operations";
import { API_ERRORS } from "@/lib/api-errors";
import { requireAuth } from "@/lib/auth-middleware";
import type { AppEnv } from "@/lib/hono-env";
import { requireId } from "@/lib/validation-middleware";

const app = new Hono<AppEnv>()
  .get("/", requireAuth, async (c) => {
    const userId = c.var.userId;
    const data = await listAccounts(userId);

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
    requireAuth,
    requireId,
    async (c) => {
      const userId = c.var.userId;
      const id = c.var.validatedId;

      const data = await getAccount(userId, id);

      if (!data) {
        return c.json(API_ERRORS.NOT_FOUND, 404);
      }

      return c.json({ data });
    },
  )
  .post(
    "/",
    requireAuth,
    zValidator("json", accountFormSchema),
    async (c) => {
      const userId = c.var.userId;
      const values = c.req.valid("json");

      const data = await createAccount(userId, values);

      return c.json({ data });
    },
  )
  .post(
    "/bulk-delete",
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

      const data = await deleteAccounts(userId, values.ids);

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
    requireAuth,
    requireId,
    zValidator("json", accountFormSchema),
    async (c) => {
      const userId = c.var.userId;
      const id = c.var.validatedId;
      const values = c.req.valid("json");

      const result = await updateAccount(userId, id, values);

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
      const userId = c.var.userId;
      const id = c.var.validatedId;

      const result = await deleteAccount(userId, id);

      if (!result.ok) {
        return c.json(API_ERRORS.NOT_FOUND, 404);
      }

      return c.json({ data: result.data });
    },
  );

export default app;
