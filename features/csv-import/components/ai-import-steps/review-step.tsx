import { AiPreviewTable } from "@/features/csv-import/components/ai-preview-table";
import { DuplicateResolution } from "@/features/csv-import/components/duplicate-resolution";
import type { EnrichedCategorization } from "@/features/csv-import/hooks/use-import-session";
import type { DuplicateMatch } from "@/features/csv-import/lib/duplicate-matcher";

interface ReviewStepProps {
  duplicates: DuplicateMatch[];
  categorizations: EnrichedCategorization[];
  pendingDuplicatesCount: number;
  onSkipAll: () => void;
  onCategoryChange: (
    csvRowIndex: number,
    categoryId: string | null,
    categoryName: string | null,
  ) => void;
}

export function ReviewStep({
  duplicates,
  categorizations,
  pendingDuplicatesCount,
  onSkipAll,
  onCategoryChange,
}: ReviewStepProps) {
  return (
    <>
      {duplicates.length > 0 && (
        <DuplicateResolution
          csvRows={categorizations.map((cat) => ({
            csvRowIndex: cat.csvRowIndex,
            date: new Date(cat.date),
            payee: cat.payee,
            amount: cat.amount,
          }))}
          pendingCount={pendingDuplicatesCount}
          onSkipAll={onSkipAll}
        />
      )}
      <AiPreviewTable
        rows={categorizations.map((cat) => {
          const duplicate = duplicates.find(
            (dup) => dup.csvIndex === cat.csvRowIndex,
          );
          return {
            csvRowIndex: cat.csvRowIndex,
            date: new Date(cat.date),
            payee: cat.payee,
            amount: cat.amount,
            categoryId: cat.categoryId,
            confidence: cat.confidence,
            duplicate: duplicate || null,
          };
        })}
        onCategoryChange={onCategoryChange}
      />
    </>
  );
}
