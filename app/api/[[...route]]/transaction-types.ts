import { clerkMiddleware } from "@hono/clerk-auth";
import { Hono } from "hono";

import { db } from "@/db/drizzle";
import { transactionTypes } from "@/db/schema";
import { requireAuth } from "@/lib/auth-middleware";
import type { AppEnv } from "@/lib/hono-env";

const app = new Hono<AppEnv>().get(
  "/",
  clerkMiddleware(),
  requireAuth,
  async (c) => {
    const _userId = c.var.userId;

    const data = await db
      .select({
        id: transactionTypes.id,
        name: transactionTypes.name,
      })
      .from(transactionTypes);

    return c.json({ data });
  },
);

export default app;
