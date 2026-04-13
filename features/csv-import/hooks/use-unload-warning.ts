import { useEffect } from "react";
import type { ImportStep } from "@/features/csv-import/types/import-types";

export function useUnloadWarning(currentStep: ImportStep) {
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (currentStep !== "UPLOAD" && currentStep !== "IMPORT") {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [currentStep]);
}
