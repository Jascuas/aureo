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
        message: "Some transactions could not be imported. Review the row outcomes.",
      }
    : importedCount === 0
      ? {
          kind: "info",
          message: "No new transactions were imported. Review the row outcomes.",
        }
    : {
        kind: "success",
        message: "Transactions imported successfully",
      };
