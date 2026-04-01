import { getAuth } from "@hono/clerk-auth";
import type { Context } from "hono";

export function requireAuth(ctx: Context): string | null {
  const auth = getAuth(ctx);
  return auth?.userId || null;
}
