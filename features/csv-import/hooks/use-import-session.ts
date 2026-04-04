import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ColumnDetectionResult, ParsedCSVRow } from '../types/import-types';
import type { DuplicateMatch } from '../lib/duplicate-matcher';
import type { ImportTemplate } from '../types/template-types';

export type ImportStep = 'UPLOAD' | 'MAPPING' | 'ANALYSIS' | 'REVIEW' | 'IMPORT';

// Enriched categorization with transaction data (flattened from API)
export type EnrichedCategorization = {
  csvRowIndex: number;
  date: string;
  amount: number;
  payee: string;
  notes?: string;
  categoryId: string | null;
  categoryName: string | null;
  transactionTypeId: string;
  transactionTypeName: string;
  confidence: number;
  reasoning: string;
  normalizedPayee: string;
  requiresManualReview: boolean;
};

type ImportSessionState = {
  currentStep: ImportStep;
  
  csvData: {
    fileName: string;
    headers: string[];
    rows: ParsedCSVRow[];
  } | null;
  
  columnMapping: {
    detectionResult: ColumnDetectionResult | null;
    selectedTemplate: ImportTemplate | null;
    finalMapping: Record<string, number> | null;
  };
  
  analyzedRows: {
    duplicates: DuplicateMatch[];
    categorizations: EnrichedCategorization[];
  };
  
  analyzedRows: {
    duplicates: DuplicateMatch[];
    categorizations: CategorizationResult[];
  };
  
  importResult: {
    importedCount: number;
    skippedCount: number;
    errorCount: number;
    errors: Array<{ row: number; message: string }>;
  } | null;
  
  setCSVData: (fileName: string, headers: string[], rows: ParsedCSVRow[]) => void;
  setDetectionResult: (result: ColumnDetectionResult) => void;
  setSelectedTemplate: (template: ImportTemplate | null) => void;
  setFinalMapping: (mapping: Record<string, number>) => void;
  
  setDuplicates: (duplicates: DuplicateMatch[]) => void;
  setCategorizations: (categorizations: EnrichedCategorization[]) => void;
  setImportResult: (result: ImportSessionState['importResult']) => void;
  
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (step: ImportStep) => void;
  reset: () => void;
};

const STEP_ORDER: ImportStep[] = ['UPLOAD', 'MAPPING', 'ANALYSIS', 'REVIEW', 'IMPORT'];

const initialState = {
  currentStep: 'UPLOAD' as ImportStep,
  csvData: null,
  columnMapping: {
    detectionResult: null,
    selectedTemplate: null,
    finalMapping: null,
  },
  analyzedRows: {
    duplicates: [],
    categorizations: [],
  },
  importResult: null,
};

export const useImportSession = create<ImportSessionState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      setCSVData: (fileName, headers, rows) => {
        set({ 
          csvData: { fileName, headers, rows },
          currentStep: 'MAPPING',
        });
      },
      
      setDetectionResult: (result) => {
        set((state) => ({
          columnMapping: {
            ...state.columnMapping,
            detectionResult: result,
          },
        }));
      },
      
      setSelectedTemplate: (template) => {
        set((state) => ({
          columnMapping: {
            ...state.columnMapping,
            selectedTemplate: template,
          },
        }));
      },
      
      setFinalMapping: (mapping) => {
        set((state) => ({
          columnMapping: {
            ...state.columnMapping,
            finalMapping: mapping,
          },
        }));
      },
      
      setDuplicates: (duplicates) => {
        set((state) => ({
          analyzedRows: {
            ...state.analyzedRows,
            duplicates,
          },
        }));
      },
      
      setCategorizations: (categorizations) => {
        set((state) => ({
          analyzedRows: {
            ...state.analyzedRows,
            categorizations,
          },
        }));
      },
      
      setImportResult: (result) => {
        set({ 
          importResult: result,
          currentStep: 'IMPORT',
        });
      },
      
      nextStep: () => {
        const { currentStep } = get();
        const currentIndex = STEP_ORDER.indexOf(currentStep);
        if (currentIndex < STEP_ORDER.length - 1) {
          set({ currentStep: STEP_ORDER[currentIndex + 1] });
        }
      },
      
      previousStep: () => {
        const { currentStep } = get();
        const currentIndex = STEP_ORDER.indexOf(currentStep);
        if (currentIndex > 0) {
          set({ currentStep: STEP_ORDER[currentIndex - 1] });
        }
      },
      
      goToStep: (step) => {
        set({ currentStep: step });
      },
      
      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'aureo-import-session',
      storage: {
        getItem: (name) => {
          const str = sessionStorage.getItem(name);
          if (!str) return null;
          
          const stored = JSON.parse(str);
          
          if (stored.state?.csvData?.rows) {
            stored.state.csvData.rows = stored.state.csvData.rows.map((row: ParsedCSVRow) => ({
              ...row,
              mapped: row.mapped ? {
                ...row.mapped,
                date: row.mapped.date ? new Date(row.mapped.date) : null,
              } : undefined,
            }));
          }
          
          if (stored.state?.columnMapping?.selectedTemplate?.createdAt) {
            stored.state.columnMapping.selectedTemplate.createdAt = new Date(
              stored.state.columnMapping.selectedTemplate.createdAt
            );
          }
          if (stored.state?.columnMapping?.selectedTemplate?.updatedAt) {
            stored.state.columnMapping.selectedTemplate.updatedAt = new Date(
              stored.state.columnMapping.selectedTemplate.updatedAt
            );
          }
          
          if (stored.state?.analyzedRows?.duplicates) {
            stored.state.analyzedRows.duplicates = stored.state.analyzedRows.duplicates.map(
              (dup: DuplicateMatch) => ({
                ...dup,
                existingTransaction: {
                  ...dup.existingTransaction,
                  date: new Date(dup.existingTransaction.date),
                },
              })
            );
          }
          
          return stored;
        },
        setItem: (name, value) => {
          sessionStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => {
          sessionStorage.removeItem(name);
        },
      },
    }
  )
);
