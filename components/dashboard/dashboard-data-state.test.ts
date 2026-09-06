import assert from "node:assert/strict";
import test from "node:test";

import { getDashboardDataState } from "./dashboard-data-state.ts";

test("error takes precedence over loading and cached data", () => {
  assert.deepEqual(
    getDashboardDataState({
      data: ["cached"],
      isEmpty: (rows) => rows.length === 0,
      isError: true,
      isLoading: true,
    }),
    { kind: "error" },
  );
});

test("loading is distinct from an empty successful result", () => {
  assert.deepEqual(
    getDashboardDataState({
      isEmpty: (rows: string[]) => rows.length === 0,
      isError: false,
      isLoading: true,
    }),
    { kind: "loading" },
  );
  assert.deepEqual(
    getDashboardDataState({
      data: [],
      isEmpty: (rows) => rows.length === 0,
      isError: false,
      isLoading: false,
    }),
    { kind: "empty" },
  );
});

test("populated and valid zero-like data remain successful states when not empty", () => {
  assert.deepEqual(
    getDashboardDataState({
      data: { amount: 0 },
      isEmpty: () => false,
      isError: false,
      isLoading: false,
    }),
    { data: { amount: 0 }, kind: "populated" },
  );
  assert.deepEqual(
    getDashboardDataState({
      data: ["transaction"],
      isEmpty: (rows) => rows.length === 0,
      isError: false,
      isLoading: false,
    }),
    { data: ["transaction"], kind: "populated" },
  );
});
