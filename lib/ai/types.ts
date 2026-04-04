/**
 * AI Provider Abstraction Layer
 * 
 * This abstraction allows easy switching between AI providers (Gemini, Claude, etc.)
 * by implementing the AIProvider interface.
 */

// ============================================================================
// Column Detection Types
// ============================================================================

export type ColumnType = 
  | 'date'
  | 'amount'
  | 'description'
  | 'category'
  | 'payee'
  | 'notes'
  | 'unknown';

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
    decimalSeparator: '.' | ',';
    thousandsSeparator: ',' | '.' | ' ' | '';
    isNegativeExpense: boolean; // True if expenses are negative numbers
  };
};

// ============================================================================
// Duplicate Detection Types
// ============================================================================

export type DuplicateMatch = {
  existingTransactionId: string;
  similarity: number; // 0-1
  matchType: 'exact' | 'fuzzy' | 'semantic';
  matchedFields: string[]; // Fields that matched (e.g., ['date', 'amount', 'payee'])
  reasoning?: string; // AI explanation of why it's a duplicate
};

export type DuplicateDetectionResult = {
  csvRowIndex: number;
  duplicates: DuplicateMatch[];
  recommendation: 'skip' | 'import' | 'review'; // AI suggestion
};

// ============================================================================
// Categorization Types
// ============================================================================

export type CategorySuggestion = {
  categoryId: string;
  categoryName: string;
  confidence: number; // 0-1
  reasoning?: string; // AI explanation
};

export type CategorizationResult = {
  csvRowIndex: number;
  suggestions: CategorySuggestion[];
  topSuggestion: CategorySuggestion;
};

// ============================================================================
// AI Provider Interface
// ============================================================================

export type AIProviderConfig = {
  apiKey: string;
  model?: string; // Optional: override default model
  temperature?: number; // 0-1, lower = more deterministic
  maxTokens?: number;
};

export type AIProvider = {
  /**
   * Detect column types and formats from CSV sample rows
   */
  detectColumns(params: {
    headers: string[];
    sampleRows: string[][]; // First 5-10 rows
    context?: string; // Optional: bank name or template hint
  }): Promise<ColumnDetectionResult>;

  /**
   * Detect potential duplicates using semantic similarity
   * (Only used as fallback after exact/fuzzy SQL matching fails)
   */
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

  /**
   * Categorize transactions using few-shot learning
   */
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

// ============================================================================
// Provider Factory
// ============================================================================

export type AIProviderType = 'gemini' | 'claude';

export type CreateAIProviderOptions = AIProviderConfig & {
  provider: AIProviderType;
};
