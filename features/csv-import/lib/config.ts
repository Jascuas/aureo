/**
 * Dev-only cap on rows imported per CSV upload.
 * `null` = no cap (production behavior).
 * Set via NEXT_PUBLIC_MAX_IMPORT_ROWS_DEV env var, only honored outside production.
 */
export const MAX_IMPORT_ROWS_DEV: number | null = (() => {
  if (process.env.NODE_ENV === "production") return null;
  const raw = process.env.NEXT_PUBLIC_MAX_IMPORT_ROWS_DEV;
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
})();

export const CSV_IMPORT_CONFIG = {
  DUPLICATE_DETECTION: {
    DATE_TOLERANCE_DAYS: 2,
    AMOUNT_TOLERANCE_PERCENT: 0.01,
    SIMILARITY_THRESHOLD: 0.85,
  },
  PAYEE_MATCHING: {
    SIMILARITY_THRESHOLD: 0.75, // pg_trgm score to qualify as fuzzy match
    AUTO_RESOLVE_CONFIDENCE: 0.85, // vote-share threshold to skip AI entirely
    MIN_MATCH_COUNT: 2, // require at least N historical matches to trust result
  },
  BATCH_LIMITS: {
    DUPLICATE_CHECK: 1000, // High limit - deterministic SQL, no AI
    PAYEE_MATCH: 1000, // High limit - deterministic SQL, no AI
    CATEGORIZATION: 30, // Smaller batches for free AI models (faster response)
    BULK_IMPORT: 500,
  },
  AI: {
    MAX_FEW_SHOT_EXAMPLES: 20,
    MIN_CONFIDENCE_THRESHOLD: 0.7,
  },
} as const;
