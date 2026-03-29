import { clerkMiddleware, getAuth } from "@hono/clerk-auth";
import { Hono } from "hono";

import { db } from "@/db/drizzle";
import { transactionTypes } from "@/db/schema";

const app = new Hono().get("/", clerkMiddleware(), async (ctx) => {
  const auth = getAuth(ctx);

  if (!auth?.userId) {
    return ctx.json({ error: "Unauthorized." }, 401);
  }

  const data = await db
    .select({
      id: transactionTypes.id,
      name: transactionTypes.name,
    })
    .from(transactionTypes);

  return ctx.json({ data });
});

export default app;
