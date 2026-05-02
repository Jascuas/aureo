export {
  ImportStep,
  BatchProgressStage,
  MatchType,
  Resolution,
  ColumnType,
} from "../const/import-const";
import {
  BatchProgressStage,
  MatchType,
  Resolution,
  ColumnType,
} from "../const/import-const";

export type DetectedColumn = {
  index: number;
  name: string;
  type: ColumnType;
  confidence: number; // 0-1
  samples: string[]; // Sample values used for detection
};

export type DateFormat =
  | "DD/MM/YYYY"
  | "MM/DD/YYYY"
  | "YYYY-MM-DD"
  | "DD-MM-YYYY"
  | "DD/MM/YY"
  | "MM/DD/YY"
  | "DD-MMM-YYYY" // 15-Jan-2024
  | "DD-MMM-YY" // 15-Jan-24
  | "YYYY/MM/DD"
  | "unknown";

export type AmountFormat = {
  decimalSeparator: "." | ",";
  thousandsSeparator: "," | "." | " " | "";
  isNegativeExpense: boolean; // True if expenses are negative numbers
};

export type ColumnDetectionResult = {
  columns: DetectedColumn[];
  dateFormat: DateFormat;
  amountFormat: AmountFormat;
  confidence: number; // Overall confidence 0-1
  method: "heuristic" | "ai"; // How it was detected
};

export type ParsedCSVRow = {
  index: number; // Row number in CSV (0-based)
  data: string[]; // Raw cell values
  mapped?: MappedTransaction; // After column mapping
};

export type MappedTransaction = {
  date: Date | null;
  amount: number | null;
  payee: string;
  description?: string;
  notes?: string;
  category?: string;

  // Validation
  errors: string[];
  warnings: string[];
};

export type ParsedCSV = {
  headers: string[];
  rows: ParsedCSVRow[];
};

export type ImportTemplate = {
  id: string;
  userId: string;
  name: string;
  columnMapping: Record<string, number>; // { "date": 0, "amount": 2, "payee": 1 }
  dateFormat: string;
  amountFormat: AmountFormat;
  createdAt: Date;
  updatedAt: Date;
};

export type ImportSessionState =
  | "idle"
  | "uploading"
  | "detecting-columns"
  | "mapping-columns"
  | "analyzing"
  | "reviewing"
  | "importing"
  | "completed"
  | "error";

export type ImportSession = {
  state: ImportSessionState;

  // CSV Data
  fileName: string;
  headers: string[];
  rows: ParsedCSVRow[];

  // Detection
  detectedColumns?: ColumnDetectionResult;
  selectedTemplate?: ImportTemplate;

  // User decisions
  columnMapping: Record<string, number>; // Final mapping after user confirmation

  // Import results
  importedCount: number;
  skippedCount: number;
  errorCount: number;

  // Error handling
  error?: string;
};

export type HeuristicConfig = {
  minConfidence: number;
  sampleSize: number;
  enableAIFallback: boolean;
};

export type BatchProgress = {
  current: number;
  total: number;
  stage: BatchProgressStage;
};

export type TransactionForAnalysis = {
  csvRowIndex: number;
  date: string;
  amount: number;
  payee: string;
  description?: string;
  notes?: string;
};

export type EnrichedCategorization = {
  csvRowIndex: number;
  date: string;
  amount: number;
  payee: string;
  notes?: string;
  categoryId: string | null;
  transactionTypeId: string;
  confidence: number;
  normalizedPayee: string;
  userEdited: boolean;
};

export type ExistingTransaction = {
  date: Date;
  amount: number;
  payee: string;
};

export type DuplicateIndicatorProps = {
  existingTransaction: ExistingTransaction;
  matchType: MatchType;
  score: number;
  onResolve?: () => void;
  isResolved?: boolean;
  resolution?: Resolution;
};

export type CsvRow = {
  csvRowIndex: number;
  date: Date;
  payee: string;
  amount: number;
  category?: string;
};

export type DuplicateResolutionProps = {
  csvRows: CsvRow[];
  pendingCount: number;
  onSkipAll?: () => void;
};

// ============================================================================
// Domain types — duplicate detection
// ============================================================================

export type DuplicateTxInput = {
  date: Date;
  amount: number;
  payee: string;
};

export type DuplicateMatch = {
  csvIndex: number;
  existingTransaction: {
    id: string;
    date: Date;
    amount: number;
    payee: string;
    accountId: string;
  };
  matchType: MatchType;
  score: number;
};

export type DuplicateDetectionResult = {
  duplicates: DuplicateMatch[];
  totalChecked: number;
  exactMatches: number;
  fuzzyMatches: number;
};

export type DuplicateResolution = {
  csvIndex: number;
  action: Resolution;
};

// ============================================================================
// Domain types — payee/category matching
// ============================================================================

export type PayeeCategoryMatch = {
  categoryId: string;
  transactionTypeId: string;
  matchCount: number;
  totalMatches: number;
  confidence: number;
  matchType: MatchType;
};

export type PayeeMatchResult = {
  csvRowIndex: number;
  matches: PayeeCategoryMatch[];
};

export type PayeeMatchInput = {
  csvRowIndex: number;
  payee: string;
};

export type PayeeMatchSummary = {
  totalChecked: number;
  autoResolved: number;
  partialMatches: number;
  unmatched: number;
};

export type PayeeMatchDetectionResult = {
  results: PayeeMatchResult[];
  summary: PayeeMatchSummary;
};

// ============================================================================
// Domain types — categorization
// ============================================================================

export type HistoricalHint = {
  categoryId: string;
  transactionTypeId: string;
  confidence: number;
  matchCount: number;
  matchType: MatchType;
};

export type CategorizationTxInput = {
  csvRowIndex: number;
  date: string;
  amount: number;
  payee: string;
  description?: string;
  notes?: string;
  historicalHint?: HistoricalHint;
};

export type CategorizationSuggestion = {
  categoryId: string | null;
  transactionTypeId: string;
  confidence: number;
  normalizedPayee: string;
};

export type CategorizationResult = {
  csvRowIndex: number;
  suggestion: CategorizationSuggestion;
};

// AI-categorized transaction (from /categorize endpoint output)
export type AICategorization = {
  csvRowIndex: number;
  categoryId: string | null;
  transactionTypeId: string;
  confidence: number;
  normalizedPayee: string;
};

// Auto-resolved transaction (from /analyze endpoint, high-confidence payee match)
// Same shape as AICategorization but categoryId is guaranteed non-null.
export type AutoResolvedTransaction = {
  csvRowIndex: number;
  categoryId: string;
  transactionTypeId: string;
  confidence: number;
  normalizedPayee: string;
};

// ============================================================================
// Domain types — /analyze endpoint
// ============================================================================

export type AITransaction = TransactionForAnalysis & {
  historicalHint?: HistoricalHint;
};

export type DuplicateSummary = {
  totalChecked: number;
  exactMatches: number;
  fuzzyMatches: number;
  totalDuplicates: number;
};

export type AnalyzeResult = {
  duplicates: DuplicateMatch[];
  duplicateSummary: DuplicateSummary;
  payeeMatches: PayeeMatchResult[];
  autoResolved: AutoResolvedTransaction[];
  aiTransactions: AITransaction[];
};

// ============================================================================
// View models
// ============================================================================

export type PreviewRow = {
  csvRowIndex: number;
  date: Date;
  payee: string;
  amount: number;
  categoryId: string | null;
  confidence: number;
  duplicate: DuplicateMatch | null;
  userEdited: boolean;
};

// ============================================================================
// Orchestrator
// ============================================================================

export type ImportOrchestrator = {
  ConfirmDialog: () => React.JSX.Element;
  handleCancel: () => Promise<void>;
  handleMappingConfirm: () => void;
  handleStartImport: () => void;
  handleCategoryChange: (
    csvRowIndex: number,
    categoryId: string | null,
    _categoryName: string | null,
    isAiSuggestion?: boolean,
  ) => void;
  cancelAnalysis: () => void;
  retryAnalyze: () => Promise<void>;
  retryCategorize: () => Promise<void>;
};
