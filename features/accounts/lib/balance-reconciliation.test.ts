import assert from "node:assert/strict";
import test from "node:test";

import { convertAmountFromMilliunits } from "@/lib/utils";

import { calculateTotalCorruptionMilliunits } from "./balance-reconciliation";

test("aggregates account discrepancies in milliunits before currency projection", () => {
  const totalCorruptionMilliunits = calculateTotalCorruptionMilliunits([
    { differenceMilliunits: 12_990 },
    { differenceMilliunits: -1_000 },
    { differenceMilliunits: 0 },
  ]);

  assert.equal(totalCorruptionMilliunits, 13_990);
  assert.equal(convertAmountFromMilliunits(totalCorruptionMilliunits), 13.99);
});
