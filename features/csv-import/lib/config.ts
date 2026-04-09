export const CSV_IMPORT_CONFIG = {
  DUPLICATE_DETECTION: {
    DATE_TOLERANCE_DAYS: 2,
    AMOUNT_TOLERANCE_PERCENT: 0.01,
    SIMILARITY_THRESHOLD: 0.85,
  },
  BATCH_LIMITS: {
    DUPLICATE_CHECK: 1000, // High limit - deterministic SQL, no AI
    CATEGORIZATION: 100, // Optimized response size allows larger batches
    BULK_IMPORT: 500,
  },
  AI: {
    MAX_FEW_SHOT_EXAMPLES: 20,
    MIN_CONFIDENCE_THRESHOLD: 0.7,
  },
} as const;
