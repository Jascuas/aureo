"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";

import { ImportStep } from "@/features/csv-import/const/import-const";
import type {
  AITransaction,
  AutoResolvedTransaction,
  ColumnDetectionResult,
  DuplicateMatch,
  EnrichedCategorization,
  ImportResult,
  ParsedCSVRow,
  PayeeMatchResult,
} from "@/features/csv-import/types/import-types";

type CsvData = {
  fileName: string;
  headers: string[];
  rows: ParsedCSVRow[];
};

type ColumnMapping = {
  detectionResult: ColumnDetectionResult | null;
  finalMapping: Record<string, number> | null;
};

type AnalyzedRows = {
  duplicates: DuplicateMatch[];
  categorizations: EnrichedCategorization[];
  payeeMatches: PayeeMatchResult[];
  autoResolved: AutoResolvedTransaction[];
  aiTransactions: AITransaction[];
};

type ImportSessionState = {
  currentStep: ImportStep;
  csvData: CsvData | null;
  columnMapping: ColumnMapping;
  analyzedRows: AnalyzedRows;
  importResult: ImportResult | null;
};

type ImportSessionActions = {
  setCSVData: (fileName: string, headers: string[], rows: ParsedCSVRow[]) => void;
  setDetectionResult: (result: ColumnDetectionResult) => void;
  setFinalMapping: (mapping: Record<string, number>) => void;
  setDuplicates: (duplicates: DuplicateMatch[]) => void;
  setCategorizations: (categorizations: EnrichedCategorization[]) => void;
  setPayeeMatches: (payeeMatches: PayeeMatchResult[]) => void;
  setAutoResolved: (autoResolved: AutoResolvedTransaction[]) => void;
  setAITransactions: (aiTransactions: AITransaction[]) => void;
  setImportResult: (result: ImportResult | null) => void;
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (step: ImportStep) => void;
  reset: () => void;
};

type ImportSessionContextValue = ImportSessionState & ImportSessionActions;

const STEP_ORDER: ImportStep[] = [
  ImportStep.UPLOAD,
  ImportStep.MAPPING,
  ImportStep.ANALYSIS,
  ImportStep.REVIEW,
  ImportStep.IMPORT,
];

const createInitialState = (): ImportSessionState => ({
  currentStep: ImportStep.UPLOAD,
  csvData: null,
  columnMapping: {
    detectionResult: null,
    finalMapping: null,
  },
  analyzedRows: {
    duplicates: [],
    categorizations: [],
    payeeMatches: [],
    autoResolved: [],
    aiTransactions: [],
  },
  importResult: null,
});

const ImportSessionContext = createContext<ImportSessionContextValue | null>(
  null,
);

export function ImportSessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(createInitialState);

  const value = useMemo<ImportSessionContextValue>(
    () => ({
      ...state,
      setCSVData: (fileName, headers, rows) => {
        setState({
          ...createInitialState(),
          currentStep: ImportStep.MAPPING,
          csvData: { fileName, headers, rows },
        });
      },
      setDetectionResult: (result) => {
        setState((current) => ({
          ...current,
          columnMapping: {
            ...current.columnMapping,
            detectionResult: result,
          },
        }));
      },
      setFinalMapping: (mapping) => {
        setState((current) => ({
          ...current,
          columnMapping: {
            ...current.columnMapping,
            finalMapping: mapping,
          },
        }));
      },
      setDuplicates: (duplicates) => {
        setState((current) => ({
          ...current,
          analyzedRows: { ...current.analyzedRows, duplicates },
        }));
      },
      setCategorizations: (categorizations) => {
        setState((current) => ({
          ...current,
          analyzedRows: { ...current.analyzedRows, categorizations },
        }));
      },
      setPayeeMatches: (payeeMatches) => {
        setState((current) => ({
          ...current,
          analyzedRows: { ...current.analyzedRows, payeeMatches },
        }));
      },
      setAutoResolved: (autoResolved) => {
        setState((current) => ({
          ...current,
          analyzedRows: { ...current.analyzedRows, autoResolved },
        }));
      },
      setAITransactions: (aiTransactions) => {
        setState((current) => ({
          ...current,
          analyzedRows: { ...current.analyzedRows, aiTransactions },
        }));
      },
      setImportResult: (importResult) => {
        setState((current) => ({
          ...current,
          currentStep: ImportStep.IMPORT,
          importResult,
        }));
      },
      nextStep: () => {
        setState((current) => {
          const currentIndex = STEP_ORDER.indexOf(current.currentStep);
          if (currentIndex >= STEP_ORDER.length - 1) return current;
          return { ...current, currentStep: STEP_ORDER[currentIndex + 1] };
        });
      },
      previousStep: () => {
        setState((current) => {
          const currentIndex = STEP_ORDER.indexOf(current.currentStep);
          if (currentIndex <= 0) return current;
          return { ...current, currentStep: STEP_ORDER[currentIndex - 1] };
        });
      },
      goToStep: (currentStep) => {
        setState((current) => ({ ...current, currentStep }));
      },
      reset: () => {
        setState(createInitialState());
      },
    }),
    [state],
  );

  return (
    <ImportSessionContext.Provider value={value}>
      {children}
    </ImportSessionContext.Provider>
  );
}

export function useImportSession(): ImportSessionContextValue {
  const context = useContext(ImportSessionContext);
  if (!context) {
    throw new Error("useImportSession must be used within ImportSessionProvider");
  }
  return context;
}
