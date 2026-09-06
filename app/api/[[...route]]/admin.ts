import { Hono } from "hono";

import { verifyBalances } from "@/features/accounts/server/balance-verification-operations";
import { requireAuth } from "@/lib/auth-middleware";
import type { AppEnv } from "@/lib/hono-env";

const app = new Hono<AppEnv>().get(
  "/verify-balances",
  requireAuth,
  async (c) => {
    return c.json(await verifyBalances(c.var.userId));
  },
);

export default app;
