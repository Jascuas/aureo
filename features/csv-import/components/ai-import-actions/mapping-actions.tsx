import { Button } from "@/components/ui/button";

interface MappingActionsProps {
  onCancel: () => void;
  onContinue: () => void;
}

export function MappingActions({ onCancel, onContinue }: MappingActionsProps) {
  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={onCancel}>
        Cancel
      </Button>
      <Button onClick={onContinue}>Continue</Button>
    </div>
  );
}
