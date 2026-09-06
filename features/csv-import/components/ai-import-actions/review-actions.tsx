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
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
      <Button className="w-full sm:w-auto" variant="outline" onClick={onCancel}>
        Cancelar
      </Button>
      <Button className="w-full sm:w-auto" onClick={onImport} disabled={hasUnresolvedDuplicates}>
        {allSkipped
          ? "Finalizar"
          : `Importar ${transactionsToImport} ${transactionsToImport === 1 ? "transacción" : "transacciones"}`}
      </Button>
    </div>
  );
}
