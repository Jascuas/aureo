import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCategorySummary,
  buildPayeeSummary,
  calculateSummaryPercentageChange,
} from "./summary-contract.ts";
import { summaryOverviewQuerySchema } from "./summary-input.ts";

test("summary input rejects invalid calendar ranges", () => {
  assert.equal(summaryOverviewQuerySchema.safeParse({ from: "2026-02-30" }).success, false);
  assert.equal(
    summaryOverviewQuerySchema.safeParse({ from: "2026-04-01", to: "2026-03-31" })
      .success,
    false,
  );
  assert.equal(summaryOverviewQuerySchema.safeParse({ accountId: "" }).success, false);
});

test("percentage changes stay finite and preserve direction for zero and negative baselines", () => {
  assert.equal(calculateSummaryPercentageChange(0, 0), 0);
  assert.equal(calculateSummaryPercentageChange(500, 0), 100);
  assert.equal(calculateSummaryPercentageChange(-500, 0), -100);
  assert.equal(calculateSummaryPercentageChange(-500, -1_000), 50);
  assert.equal(calculateSummaryPercentageChange(-1_500, -1_000), -50);
});

test("category and payee rankings sort by the milliunit metric returned to the UI", () => {
  assert.deepEqual(
    buildPayeeSummary(
      [
        { name: "Small", valueMilliunits: 1_999 },
        { name: "Large", valueMilliunits: 2_001 },
      ],
      2,
    ).map((row) => row.name),
    ["Large", "Small"],
  );

  assert.deepEqual(
    buildCategorySummary(
      [
        { name: "Comida", valueMilliunits: 10_000 },
        { name: "Transporte", valueMilliunits: 9_000 },
        { isUncategorized: true, name: "Sin categoría", valueMilliunits: 8_000 },
        { name: "Ocio", valueMilliunits: 7_000 },
      ],
      1,
    ),
    [
      { name: "Otros", valueMilliunits: 16_000 },
      { name: "Comida", valueMilliunits: 10_000 },
      { name: "Sin categoría", isUncategorized: true, valueMilliunits: 8_000 },
    ],
  );
});
