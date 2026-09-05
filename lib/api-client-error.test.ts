import assert from "node:assert/strict";
import test from "node:test";

import {
  getMutationErrorMessage,
  MutationHttpError,
} from "./api-client-error";

test("mutation feedback preserves handled HTTP messages and hides raw network errors", () => {
  const fallback = "No se pudo crear la cuenta. Inténtalo de nuevo.";
  const httpMessage = getMutationErrorMessage(new Response(null, { status: 404 }), fallback);

  assert.equal(httpMessage, "El registro ya no existe o no está disponible.");
  assert.equal(
    getMutationErrorMessage(new MutationHttpError(httpMessage), fallback),
    httpMessage,
  );
  assert.equal(getMutationErrorMessage(new TypeError("Failed to fetch"), fallback), fallback);
});
