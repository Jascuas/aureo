import { Hono } from "hono";

import { SUPPORTED_TRANSACTION_TYPES } from "@/features/transaction-types/lib/transaction-types";
import { requireAuth } from "@/lib/auth-middleware";
import type { AppEnv } from "@/lib/hono-env";

const app = new Hono<AppEnv>().get(
  "/",
  requireAuth,
  (c) =>
    c.json({
      data: SUPPORTED_TRANSACTION_TYPES.map(({ id, name }) => ({ id, name })),
    }),
);

export default app;
