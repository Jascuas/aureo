import { Button } from "@/components/ui/button";

interface UploadActionsProps {
  onCancel: () => void;
}

export function UploadActions({ onCancel }: UploadActionsProps) {
  return (
    <Button variant="outline" onClick={onCancel}>
      Cancel
    </Button>
  );
}
