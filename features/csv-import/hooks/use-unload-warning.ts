import { useEffect } from "react";
import { ImportStep } from "@/features/csv-import/const/import-const";

export function useUnloadWarning(currentStep: ImportStep) {
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (
        currentStep !== ImportStep.UPLOAD &&
        currentStep !== ImportStep.IMPORT
      ) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [currentStep]);
}
