import assert from "node:assert/strict";
import test from "node:test";

import type { MiddlewareHandler } from "hono";

import type { AppEnv } from "@/lib/hono-env";

import { createTransactionsApp } from "./transactions";

const testAuthMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  c.set("userId", "test-user");
  await next();
};

const transactionsApp = createTransactionsApp(testAuthMiddleware);

const transactionWrite = {
  accountId: "account-1",
  amount: 50_000,
  categoryId: null,
  date: "2026-09-02T00:00:00.000Z",
  importKey: "attempt-probe:0",
  notes: null,
  payee: "Example payee",
  transactionTypeId: "income",
};

test("ordinary transaction writes reject CSV import idempotency keys", async () => {
  const requests = [
    { body: transactionWrite, method: "POST", path: "/" },
    { body: [transactionWrite], method: "POST", path: "/bulk-create" },
    { body: transactionWrite, method: "PATCH", path: "/transaction-1" },
  ] as const;

  for (const request of requests) {
    const response = await transactionsApp.request(request.path, {
      body: JSON.stringify(request.body),
      headers: { "content-type": "application/json" },
      method: request.method,
    });

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      error: "Invalid category or transaction type ID",
    });
  }
});
