import assert from "node:assert/strict";
import test from "node:test";

import { getImportResultFeedback } from "./import-result-feedback.ts";

test("CSV import feedback reports failed rows as a partial failure", () => {
  assert.deepEqual(getImportResultFeedback(1, 1), {
    kind: "error",
    message:
      "Algunas transacciones no se han podido importar. Revisa el resultado de cada fila.",
  });
});

test("CSV import feedback reports successful imports only with no failed rows", () => {
  assert.deepEqual(getImportResultFeedback(0, 1), {
    kind: "success",
    message: "Transacciones importadas correctamente",
  });
});

test("CSV import feedback does not report an all-skipped import as successful", () => {
  assert.deepEqual(getImportResultFeedback(0, 0), {
    kind: "info",
    message:
      "No se han importado transacciones nuevas. Revisa el resultado de cada fila.",
  });
});
