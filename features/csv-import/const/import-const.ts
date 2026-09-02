export enum ImportStep {
  UPLOAD = "UPLOAD",
  MAPPING = "MAPPING",
  ANALYSIS = "ANALYSIS",
  REVIEW = "REVIEW",
  IMPORT = "IMPORT",
}

export enum BatchProgressStage {
  ANALYZING = "analyzing",
  CATEGORIZATION = "categorization",
}

export enum MatchType {
  Exact = "exact",
  Fuzzy = "fuzzy",
}

export enum Resolution {
  Skip = "skip",
  Import = "import",
}

export enum ColumnType {
  Date = "date",
  Amount = "amount",
  Payee = "payee",
  Description = "description",
  Notes = "notes",
  Balance = "balance",
  Category = "category",
  Unknown = "unknown",
}

export const DEFAULT_HEURISTIC_CONFIG = {
  minConfidence: 0.7,
  sampleSize: 10,
  enableAIFallback: true,
} as const;

export const DEFAULT_DATE_FORMAT = "DD/MM/YYYY";

export const DEFAULT_AMOUNT_FORMAT = {
  decimalSeparator: ",",
  thousandsSeparator: ".",
  isNegativeExpense: true,
} as const;
