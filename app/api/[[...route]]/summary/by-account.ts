import { Hono } from "hono";

import { getSummaryAccountBreakdown } from "@/features/summary/server/summary-operations";
import { requireAuth } from "@/lib/auth-middleware";
import type { AppEnv } from "@/lib/hono-env";

const app = new Hono<AppEnv>().get(
  "/by-account",
  requireAuth,
  async (c) => {
    const userId = c.var.userId;
    const data = await getSummaryAccountBreakdown(userId);

    return c.json({ data });
  },
);

export default app;
