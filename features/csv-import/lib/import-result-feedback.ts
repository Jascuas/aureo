export type ImportResultFeedback =
  | { kind: "error"; message: string }
  | { kind: "info"; message: string }
  | { kind: "success"; message: string };

export const getImportResultFeedback = (
  failedCount: number,
  importedCount: number,
): ImportResultFeedback =>
  failedCount > 0
    ? {
        kind: "error",
        message:
          "Algunas transacciones no se han podido importar. Revisa el resultado de cada fila.",
      }
    : importedCount === 0
      ? {
          kind: "info",
          message:
            "No se han importado transacciones nuevas. Revisa el resultado de cada fila.",
        }
    : {
        kind: "success",
        message: "Transacciones importadas correctamente",
      };
