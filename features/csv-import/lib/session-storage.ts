import type { PersistStorage, StorageValue } from "zustand/middleware";

import type {
  DuplicateMatch,
  ParsedCSVRow,
} from "@/features/csv-import/types/import-types";

type Rehydratable = {
  state?: {
    csvData?: { rows?: ParsedCSVRow[] } | null;
    columnMapping?: {
      selectedTemplate?: {
        createdAt?: string | Date;
        updatedAt?: string | Date;
      } | null;
    };
    analyzedRows?: { duplicates?: DuplicateMatch[] };
  };
};

function rehydrateDates(stored: Rehydratable): Rehydratable {
  if (stored.state?.csvData?.rows) {
    stored.state.csvData.rows = stored.state.csvData.rows.map((row) => ({
      ...row,
      mapped: row.mapped
        ? {
            ...row.mapped,
            date: row.mapped.date ? new Date(row.mapped.date) : null,
          }
        : undefined,
    }));
  }

  const template = stored.state?.columnMapping?.selectedTemplate;
  if (template?.createdAt) {
    template.createdAt = new Date(template.createdAt);
  }
  if (template?.updatedAt) {
    template.updatedAt = new Date(template.updatedAt);
  }

  if (stored.state?.analyzedRows?.duplicates) {
    stored.state.analyzedRows.duplicates =
      stored.state.analyzedRows.duplicates.map((dup) => ({
        ...dup,
        existingTransaction: {
          ...dup.existingTransaction,
          date: new Date(dup.existingTransaction.date),
        },
      }));
  }

  return stored;
}

export function createSessionStorage<T>(): PersistStorage<T> {
  return {
    getItem: (name) => {
      const str = sessionStorage.getItem(name);
      if (!str) return null;
      const stored = JSON.parse(str) as Rehydratable;
      return rehydrateDates(stored) as StorageValue<T>;
    },
    setItem: (name, value) => {
      sessionStorage.setItem(name, JSON.stringify(value));
    },
    removeItem: (name) => {
      sessionStorage.removeItem(name);
    },
  };
}
