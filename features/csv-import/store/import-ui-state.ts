import { create } from "zustand";
import type { BatchProgress } from "@/features/csv-import/types/import-types";

type ImportUIState = {
  loading: {
    parsingCSV: boolean;
    detectingColumns: boolean;
    analyzing: boolean;
    categorizing: boolean;
  };

  errors: {
    upload: string | null;
    detection: string | null;
    analyze: string | null;
    categorize: string | null;
  };

  batchProgress: BatchProgress | null;

  setLoading: (key: keyof ImportUIState["loading"], value: boolean) => void;
  setError: (
    key: keyof ImportUIState["errors"],
    message: string | null,
  ) => void;
  clearErrors: () => void;
  setBatchProgress: (progress: BatchProgress | null) => void;
  reset: () => void;
};

export const useImportUIState = create<ImportUIState>((set) => ({
  loading: {
    parsingCSV: false,
    detectingColumns: false,
    analyzing: false,
    categorizing: false,
  },

  errors: {
    upload: null,
    detection: null,
    analyze: null,
    categorize: null,
  },

  batchProgress: null,

  setLoading: (key, value) =>
    set((state) => ({
      loading: { ...state.loading, [key]: value },
    })),

  setError: (key, message) =>
    set((state) => ({
      errors: { ...state.errors, [key]: message },
    })),

  clearErrors: () =>
    set({
      errors: {
        upload: null,
        detection: null,
        analyze: null,
        categorize: null,
      },
    }),

  setBatchProgress: (progress) => set({ batchProgress: progress }),

  reset: () =>
    set({
      loading: {
        parsingCSV: false,
        detectingColumns: false,
        analyzing: false,
        categorizing: false,
      },
      errors: {
        upload: null,
        detection: null,
        analyze: null,
        categorize: null,
      },
      batchProgress: null,
    }),
}));
