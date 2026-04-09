import type { ColumnType } from "@/features/csv-import/types/import-types";

export type ColumnDetectionResult = {
  columns: Array<{
    index: number;
    name: string;
    detectedType: ColumnType;
    confidence: number; // 0-1
    suggestedMapping?: string; // Optional: suggested field name for our schema
  }>;
  dateFormat?: string; // e.g., "DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"
  amountFormat?: {
    decimalSeparator: "." | ",";
    thousandsSeparator: "," | "." | " " | "";
    isNegativeExpense: boolean; // True if expenses are negative numbers
  };
};

export type DuplicateMatch = {
  existingTransactionId: string;
  similarity: number; // 0-1
  matchType: "exact" | "fuzzy" | "semantic";
  matchedFields: string[]; // Fields that matched (e.g., ['date', 'amount', 'payee'])
  reasoning?: string; // AI explanation of why it's a duplicate
};

export type DuplicateDetectionResult = {
  csvRowIndex: number;
  duplicates: DuplicateMatch[];
  recommendation: "skip" | "import" | "review"; // AI suggestion
};

export type CategorySuggestion = {
  categoryId: string;
  categoryName?: string; // Optional - frontend will map from categoryId
  confidence: number; // 0-1
  reasoning?: string; // AI explanation
};

export type CategorizationResult = {
  csvRowIndex: number;
  suggestions: CategorySuggestion[];
  topSuggestion: CategorySuggestion;
};

export type AIProviderConfig = {
  apiKey: string;
  model?: string; // Optional: override default model
  temperature?: number; // 0-1, lower = more deterministic
  maxTokens?: number;
};

export type AIProvider = {
  detectColumns(params: {
    headers: string[];
    sampleRows: string[][]; // First 5-10 rows
    context?: string; // Optional: bank name or template hint
  }): Promise<ColumnDetectionResult>;

  detectDuplicates(params: {
    newTransactions: Array<{
      date: string;
      amount: number;
      payee: string;
      description?: string;
    }>;
    existingTransactions: Array<{
      id: string;
      date: string;
      amount: number;
      payee: string;
      description?: string;
    }>;
  }): Promise<DuplicateDetectionResult[]>;

  categorizeTransactions(params: {
    transactions: Array<{
      csvRowIndex: number;
      date: string;
      amount: number;
      payee: string;
      description?: string;
      notes?: string;
    }>;
    availableCategories: Array<{
      id: string;
      name: string;
    }>;
    fewShotExamples?: Array<{
      payee: string;
      description?: string;
      categoryId: string;
      categoryName: string;
    }>;
  }): Promise<CategorizationResult[]>;
};

export type AIProviderType = "gemini" | "claude";

export type CreateAIProviderOptions = AIProviderConfig & {
  provider: AIProviderType;
};
