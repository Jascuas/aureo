export type ColumnType = 
  | 'date'
  | 'amount'
  | 'payee'
  | 'description'
  | 'notes'
  | 'balance'
  | 'category'
  | 'unknown';

export type DetectedColumn = {
  index: number;
  name: string;
  type: ColumnType;
  confidence: number; // 0-1
  samples: string[]; // Sample values used for detection
};

export type DateFormat = 
  | 'DD/MM/YYYY'
  | 'MM/DD/YYYY'
  | 'YYYY-MM-DD'
  | 'DD-MM-YYYY'
  | 'DD/MM/YY'
  | 'MM/DD/YY'
  | 'DD-MMM-YYYY' // 15-Jan-2024
  | 'DD-MMM-YY'   // 15-Jan-24
  | 'YYYY/MM/DD'
  | 'unknown';

export type AmountFormat = {
  decimalSeparator: '.' | ',';
  thousandsSeparator: ',' | '.' | ' ' | '';
  isNegativeExpense: boolean; // True if expenses are negative numbers
};

export type ColumnDetectionResult = {
  columns: DetectedColumn[];
  dateFormat: DateFormat;
  amountFormat: AmountFormat;
  confidence: number; // Overall confidence 0-1
  method: 'heuristic' | 'ai'; // How it was detected
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
  | 'idle'
  | 'uploading'
  | 'detecting-columns'
  | 'mapping-columns'
  | 'analyzing'
  | 'reviewing'
  | 'importing'
  | 'completed'
  | 'error';

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
  minConfidence: number; // Minimum confidence to accept heuristic result
  sampleSize: number; // Number of rows to sample for detection
  enableAIFallback: boolean; // Use AI if heuristic confidence is low
};

export const DEFAULT_HEURISTIC_CONFIG: HeuristicConfig = {
  minConfidence: 0.7,
  sampleSize: 10,
  enableAIFallback: true,
};
