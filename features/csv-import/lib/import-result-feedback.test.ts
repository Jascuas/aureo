import assert from "node:assert/strict";
import test from "node:test";

import { getImportResultFeedback } from "./import-result-feedback.ts";

test("CSV import feedback reports failed rows as a partial failure", () => {
  assert.deepEqual(getImportResultFeedback(1, 1), {
    kind: "error",
    message: "Some transactions could not be imported. Review the row outcomes.",
  });
});

test("CSV import feedback reports successful imports only with no failed rows", () => {
  assert.deepEqual(getImportResultFeedback(0, 1), {
    kind: "success",
    message: "Transactions imported successfully",
  });
});

test("CSV import feedback does not report an all-skipped import as successful", () => {
  assert.deepEqual(getImportResultFeedback(0, 0), {
    kind: "info",
    message: "No new transactions were imported. Review the row outcomes.",
  });
});
