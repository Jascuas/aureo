import { Button } from "@/components/ui/button";

interface ReviewActionsProps {
  onCancel: () => void;
  onImport: () => void;
  transactionsToImport: number;
  hasUnresolvedDuplicates: boolean;
}

export function ReviewActions({
  onCancel,
  onImport,
  transactionsToImport,
  hasUnresolvedDuplicates,
}: ReviewActionsProps) {
  const allSkipped = transactionsToImport === 0;

  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={onCancel}>
        Cancel
      </Button>
      <Button onClick={onImport} disabled={hasUnresolvedDuplicates}>
        {allSkipped
          ? "Finish"
          : `Import ${transactionsToImport} ${transactionsToImport === 1 ? "Transaction" : "Transactions"}`}
      </Button>
    </div>
  );
}
