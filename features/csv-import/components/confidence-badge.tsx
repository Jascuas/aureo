"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ConfidenceBadgeProps = {
  confidence: number;
};

export const ConfidenceBadge = ({ confidence }: ConfidenceBadgeProps) => {
  const percentage = Math.round(confidence * 100);
  
  const variant = confidence >= 0.9
    ? "positive"
    : confidence >= 0.7
      ? "warning"
      : "negative";

  const colorClasses = {
    positive: "bg-crt-pos/10 text-crt-pos border-crt-pos/40",
    warning: "bg-crt-amber/10 text-crt-amber border-crt-amber/40",
    negative: "bg-destructive/10 text-destructive border-destructive/40",
  };

  return (
    <Badge
      className={cn("border", colorClasses[variant])}
      aria-label={`Confianza: ${percentage}%`}
    >
      {percentage}%
    </Badge>
  );
};
