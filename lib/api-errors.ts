export const API_ERRORS = {
  UNAUTHORIZED: { error: "Unauthorized" },
  NOT_FOUND: { error: "Not found" },
  MISSING_ID: { error: "Missing id" },
  BAD_REQUEST: { error: "Bad request" },
} as const;

export type ApiErrorResponse = (typeof API_ERRORS)[keyof typeof API_ERRORS];
