import { createMiddleware } from "hono/factory";

import { API_ERRORS } from "./api-errors";
import type { AppEnv } from "./hono-env";

/**
 * Middleware that validates the 'id' parameter exists
 * Must be used AFTER zValidator for param
 * Sets the validated id in context as 'validatedId'
 */
export const requireId = createMiddleware<AppEnv>(async (c, next) => {
  // Access the validated param from Hono context
  // The zValidator middleware stores it in req.param()
  const id = c.req.param("id");

  if (!id) {
    return c.json(API_ERRORS.MISSING_ID, 400);
  }

  c.set("validatedId", id);
  await next();
});
