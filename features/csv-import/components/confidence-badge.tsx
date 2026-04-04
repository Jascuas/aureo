"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ConfidenceBadgeProps = {
  confidence: number;
};

export const ConfidenceBadge = ({ confidence }: ConfidenceBadgeProps) => {
  const percentage = Math.round(confidence * 100);
  
  const variant = confidence >= 0.9 
    ? 'success' 
    : confidence >= 0.7 
    ? 'warning' 
    : 'danger';
  
  const colorClasses = {
    success: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    danger: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
  };
  
  return (
    <Badge 
      className={cn('border', colorClasses[variant])}
      aria-label={`Confidence: ${percentage}%`}
    >
      {percentage}%
    </Badge>
  );
};
