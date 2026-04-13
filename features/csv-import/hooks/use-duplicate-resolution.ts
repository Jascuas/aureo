import { create } from "zustand";
import type { DuplicateMatch } from "@/features/csv-import/lib/duplicate-matcher";

type DuplicateResolution = {
  csvIndex: number;
  action: "skip" | "import";
};

type DuplicateResolutionState = {
  isOpen: boolean;
  currentDuplicate: DuplicateMatch | null;
  resolutions: DuplicateResolution[];

  openResolution: (duplicate: DuplicateMatch) => void;
  closeResolution: () => void;

  resolveAs: (csvIndex: number, action: "skip" | "import") => void;
  skipAllExact: (duplicates: DuplicateMatch[]) => void;

  getResolution: (csvIndex: number) => DuplicateResolution | undefined;
  getPendingCount: (duplicates: DuplicateMatch[]) => number;

  reset: () => void;
};

export const useDuplicateResolution = create<DuplicateResolutionState>(
  (set, get) => ({
    isOpen: false,
    currentDuplicate: null,
    resolutions: [],

    openResolution: (duplicate) => {
      set({
        isOpen: true,
        currentDuplicate: duplicate,
      });
    },

    closeResolution: () => {
      set({
        isOpen: false,
        currentDuplicate: null,
      });
    },

    resolveAs: (csvIndex, action) => {
      set((state) => {
        const existingIndex = state.resolutions.findIndex(
          (r) => r.csvIndex === csvIndex,
        );

        if (existingIndex >= 0) {
          const newResolutions = [...state.resolutions];
          newResolutions[existingIndex] = { csvIndex, action };
          return { resolutions: newResolutions };
        }

        return {
          resolutions: [...state.resolutions, { csvIndex, action }],
        };
      });
    },

    skipAllExact: (duplicates) => {
      const exactDuplicates = duplicates.filter((d) => d.matchType === "exact");

      set((state) => {
        const newResolutions = [...state.resolutions];

        exactDuplicates.forEach((dup) => {
          const existingIndex = newResolutions.findIndex(
            (r) => r.csvIndex === dup.csvIndex,
          );

          if (existingIndex >= 0) {
            newResolutions[existingIndex] = {
              csvIndex: dup.csvIndex,
              action: "skip",
            };
          } else {
            newResolutions.push({ csvIndex: dup.csvIndex, action: "skip" });
          }
        });

        return { resolutions: newResolutions };
      });
    },

    getResolution: (csvIndex) => {
      return get().resolutions.find((r) => r.csvIndex === csvIndex);
    },

    getPendingCount: (duplicates) => {
      const { resolutions } = get();
      return duplicates.filter(
        (dup) => !resolutions.find((r) => r.csvIndex === dup.csvIndex),
      ).length;
    },

    reset: () => {
      set({
        isOpen: false,
        currentDuplicate: null,
        resolutions: [],
      });
    },
  }),
);
