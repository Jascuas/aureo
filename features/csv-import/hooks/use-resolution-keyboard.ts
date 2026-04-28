import { useEffect } from "react";
import type { DuplicateMatch } from "@/features/csv-import/lib/duplicate-matcher";
import { Resolution } from "@/features/csv-import/const/import-const";

type UseResolutionKeyboardParams = {
  isOpen: boolean;
  currentDuplicate: DuplicateMatch | null;
  resolveAs: (csvIndex: number, action: Resolution) => void;
  closeResolution: () => void;
};

export const useResolutionKeyboard = ({
  isOpen,
  currentDuplicate,
  resolveAs,
  closeResolution,
}: UseResolutionKeyboardParams) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || !currentDuplicate) return;

      if (e.key === "Escape") {
        e.preventDefault();
        resolveAs(currentDuplicate.csvIndex, Resolution.Skip);
        closeResolution();
      }

      if (e.key === "Enter") {
        e.preventDefault();
        resolveAs(currentDuplicate.csvIndex, Resolution.Import);
        closeResolution();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentDuplicate, resolveAs, closeResolution]);
};
