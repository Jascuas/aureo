import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Resolution } from "@/features/csv-import/const/import-const";

type ResolvedBadgeProps = {
  resolution: Resolution;
  onResolve?: () => void;
};

export const ResolvedBadge = ({
  resolution,
  onResolve,
}: ResolvedBadgeProps) => {
  const isSkip = resolution === Resolution.Skip;
  const displayText = isSkip ? "Omitida" : "Se importará";
  const colorClass = isSkip ? "text-muted-foreground" : "text-crt-pos";

  if (!onResolve) return null;

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        className={`text-xs font-medium ${colorClass} h-6 gap-1 px-2`}
        onClick={onResolve}
      >
        {displayText}
        <AlertCircle className="size-4" />
      </Button>
    </div>
  );
};
