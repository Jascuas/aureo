import assert from "node:assert/strict";
import test from "node:test";

import { getApiErrorMessage } from "./get-api-error-message.ts";

test("returns the established API error string", () => {
  assert.equal(
    getApiErrorMessage(
      { error: "A template with this name already exists" },
      "Failed to save template",
    ),
    "A template with this name already exists",
  );
});

test("uses the caller fallback for unexpected error responses", () => {
  assert.equal(
    getApiErrorMessage({ error: { message: "unexpected" } }, "Failed to update template"),
    "Failed to update template",
  );
});
