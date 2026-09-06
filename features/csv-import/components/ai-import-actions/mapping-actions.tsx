import { Button } from "@/components/ui/button";

interface MappingActionsProps {
  onCancel: () => void;
  onContinue: () => void;
}

export function MappingActions({ onCancel, onContinue }: MappingActionsProps) {
  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
      <Button className="w-full sm:w-auto" variant="outline" onClick={onCancel}>
        Cancelar
      </Button>
      <Button className="w-full sm:w-auto" onClick={onContinue}>Continuar</Button>
    </div>
  );
}
