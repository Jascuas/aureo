export const API_ERRORS = {
  UNAUTHORIZED: { error: "Unauthorized" },
  NOT_FOUND: { error: "Not found" },
  MISSING_ID: { error: "Missing id" },
  BAD_REQUEST: { error: "Bad request" },
  INTERNAL_SERVER_ERROR: { error: "Internal server error" },
  INVALID_FOREIGN_KEY: { error: "Invalid category or transaction type ID" },
  DUPLICATE_TEMPLATE_NAME: { error: "A template with this name already exists" },
  INVALID_ACCOUNT: { error: "Account not found" },
} as const;

export type ApiErrorResponse = (typeof API_ERRORS)[keyof typeof API_ERRORS];
