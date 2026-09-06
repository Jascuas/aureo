import { Button } from "@/components/ui/button";

interface UploadActionsProps {
  onCancel: () => void;
}

export function UploadActions({ onCancel }: UploadActionsProps) {
  return (
    <Button className="w-full sm:w-auto" variant="outline" onClick={onCancel}>
      Cancelar
    </Button>
  );
}
