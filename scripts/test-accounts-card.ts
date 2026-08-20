import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  getAccountRowColors,
  getAccountSummaryMetrics,
} from "../components/dashboard/accounts-card-lib.ts";

const mixedRows = [
  { id: "checking", name: "Checking", value: 12 },
  { id: "cleared", name: "Cleared", value: 0 },
  { id: "credit", name: "Credit", value: -5 },
];
const mixedMetrics = getAccountSummaryMetrics(mixedRows);

assert.deepEqual(mixedMetrics.rows, mixedRows);
assert.equal(mixedMetrics.maxAbs, 12);
assert.equal(mixedMetrics.totalAbs, 17);
assert.equal(mixedMetrics.total, 7);
assert.deepEqual(getAccountRowColors(mixedRows), [
  "var(--crt-pie-1)",
  "var(--crt-muted)",
  "var(--crt-pie-2)",
]);

const zeroRows = [
  { id: "savings", name: "Savings", value: 0 },
  { id: "cash", name: "Cash", value: 0 },
];
const zeroMetrics = getAccountSummaryMetrics(zeroRows);

assert.deepEqual(zeroMetrics.rows, zeroRows);
assert.equal(zeroMetrics.maxAbs, 0);
assert.equal(zeroMetrics.totalAbs, 0);
assert.equal(zeroMetrics.total, 0);
assert.deepEqual(getAccountRowColors(zeroRows), [
  "var(--crt-muted)",
  "var(--crt-muted)",
]);

const accountsCardSource = readFileSync(
  new URL("../components/dashboard/accounts-card.tsx", import.meta.url),
  "utf8",
);

assert.match(
  accountsCardSource,
  /getAccountSummaryMetrics\(\s*data \?\? \[\],?\s*\)/,
);
assert.match(accountsCardSource, /getAccountRowColors\(rows\)/);
assert.doesNotMatch(accountsCardSource, /\bSYNC\b/);
assert.doesNotMatch(
  accountsCardSource,
  /syncTime|useRef|useEffect|toLocaleTimeString/,
);

console.log("Accounts card regression checks passed.");
