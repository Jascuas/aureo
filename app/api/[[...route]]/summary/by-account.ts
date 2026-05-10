import { clerkMiddleware } from "@hono/clerk-auth";
import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";

import { db } from "@/db/drizzle";
import { accounts } from "@/db/schema";
import { requireAuth } from "@/lib/auth-middleware";
import type { AppEnv } from "@/lib/hono-env";
import { convertAmountFromMilliunits } from "@/lib/utils";

const app = new Hono<AppEnv>().get(
  "/by-account",
  clerkMiddleware(),
  requireAuth,
  async (c) => {
    const userId = c.var.userId;

    const rows = await db
      .select({
        id: accounts.id,
        name: accounts.name,
        balance: accounts.balance,
      })
      .from(accounts)
      .where(eq(accounts.userId, userId))
      .orderBy(desc(accounts.balance));

    const data = rows.map((r) => ({
      id: r.id,
      name: r.name,
      value: convertAmountFromMilliunits(Number(r.balance ?? 0)),
    }));

    return c.json({ data });
  },
);

export default app;
