import { getAuth } from "@hono/clerk-auth";
import { createMiddleware } from "hono/factory";

import { API_ERRORS } from "./api-errors";
import type { AppEnv } from "./hono-env";

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const auth = getAuth(c);

  if (!auth?.userId) {
    return c.json(API_ERRORS.UNAUTHORIZED, 401);
  }

  c.set("userId", auth.userId);
  await next();
});
