import { FileSearch, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DashboardErrorStateProps = {
  className?: string;
  description: string;
  onRetry: () => void;
  title: string;
};

export const DashboardErrorState = ({
  className,
  description,
  onRetry,
  title,
}: DashboardErrorStateProps) => (
  <div
    className={cn(
      "flex flex-col items-center justify-center gap-3 py-8 text-center",
      className,
    )}
    role="alert"
  >
    <TriangleAlert className="text-destructive size-6" aria-hidden />
    <div className="space-y-1">
      <p className="text-destructive text-xs font-bold tracking-widest uppercase">
        {title}
      </p>
      <p className="text-muted-foreground text-xs">{description}</p>
    </div>
    <Button size="sm" variant="outline" onClick={onRetry}>
      Reintentar
    </Button>
  </div>
);

type DashboardEmptyStateProps = {
  className?: string;
  message: string;
};

export const DashboardEmptyState = ({
  className,
  message,
}: DashboardEmptyStateProps) => (
  <div
    className={cn(
      "flex flex-col items-center justify-center gap-3 py-8 text-center",
      className,
    )}
    role="status"
  >
    <FileSearch className="text-muted-foreground size-6" aria-hidden />
    <p className="text-muted-foreground text-xs uppercase tracking-widest">
      {message}
    </p>
  </div>
);
