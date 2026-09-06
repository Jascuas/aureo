import assert from "node:assert/strict";
import test from "node:test";

import { getApiErrorMessage } from "./get-api-error-message.ts";

test("returns the duplicate-template API error in Spanish", () => {
  assert.equal(
    getApiErrorMessage(
      { error: "Ya existe una plantilla con este nombre." },
      "No se ha podido guardar la plantilla",
    ),
    "Ya existe una plantilla con este nombre.",
  );
});

test("uses the caller fallback for unexpected error responses", () => {
  assert.equal(
    getApiErrorMessage(
      { error: { message: "unexpected" } },
      "No se ha podido actualizar la plantilla",
    ),
    "No se ha podido actualizar la plantilla",
  );
});
