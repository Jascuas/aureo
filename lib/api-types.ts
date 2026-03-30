import type { InferResponseType } from "hono";

import { client } from "@/lib/hono";

// Account types
export type Account = InferResponseType<
  typeof client.api.accounts.$get,
  200
>["data"][0];

export type AccountList = InferResponseType<
  typeof client.api.accounts.$get,
  200
>["data"];

// Category types
export type Category = InferResponseType<
  typeof client.api.categories.$get,
  200
>["data"][0];

export type CategoryList = InferResponseType<
  typeof client.api.categories.$get,
  200
>["data"];

// Transaction Type types
export type TransactionType = InferResponseType<
  typeof client.api["transaction-types"].$get,
  200
>["data"][0];

export type TransactionTypeList = InferResponseType<
  typeof client.api["transaction-types"].$get,
  200
>["data"];
