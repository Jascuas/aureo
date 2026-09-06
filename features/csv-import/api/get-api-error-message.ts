export function getApiErrorMessage(payload: unknown, fallback: string): string {
  if (typeof payload !== "object" || payload === null || !("error" in payload)) {
    return fallback;
  }

  return typeof payload.error === "string" && payload.error.trim()
    ? payload.error
    : fallback;
}
