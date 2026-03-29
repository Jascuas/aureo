import { clerkMiddleware } from "@hono/clerk-auth";
import { Hono } from "hono";

import { db } from "@/db/drizzle";
import { transactionTypes } from "@/db/schema";
import { requireAuth } from "@/lib/auth-middleware";

const app = new Hono().get("/", clerkMiddleware(), async (ctx) => {
  const auth = requireAuth(ctx);

  if (!auth.success) return auth.response;

  const data = await db
    .select({
      id: transactionTypes.id,
      name: transactionTypes.name,
    })
    .from(transactionTypes);

  return ctx.json({ data });
});

export default app;
