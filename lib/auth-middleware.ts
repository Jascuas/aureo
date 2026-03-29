import { getAuth } from "@hono/clerk-auth";
import type { Context } from "hono";

type AuthResult =
  | { success: true; userId: string }
  | { success: false; response: Response };

export function requireAuth(ctx: Context): AuthResult {
  const auth = getAuth(ctx);

  if (!auth?.userId) {
    return {
      success: false,
      response: ctx.json({ error: "Unauthorized." }, 401),
    };
  }

  return { success: true, userId: auth.userId };
}
