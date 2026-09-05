import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { summaryOverviewQuerySchema } from "@/features/summary/lib/summary-input";
import { getSummaryOverview } from "@/features/summary/server/summary-operations";
import { API_ERRORS } from "@/lib/api-errors";
import { requireAuth } from "@/lib/auth-middleware";
import type { AppEnv } from "@/lib/hono-env";

const app = new Hono<AppEnv>().get(
  "/overview",
  requireAuth,
  zValidator("query", summaryOverviewQuerySchema, (result, c) => {
    if (!result.success) {
      return c.json(API_ERRORS.BAD_REQUEST, 400);
    }
  }),
  async (c) => {
    const result = await getSummaryOverview(c.var.userId, c.req.valid("query"));

    if (!result.ok) {
      return c.json(API_ERRORS.INVALID_ACCOUNT, 404);
    }

    return c.json({ data: result.data });
  },
);

export default app;