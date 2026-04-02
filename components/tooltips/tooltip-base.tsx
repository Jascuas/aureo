import type { ReactNode } from "react";

import { Separator } from "@/components/ui/separator";

type TooltipBaseProps = {
  title: ReactNode;
  children: ReactNode;
};

type TooltipItemProps = {
  label: string;
  value: string;
  color: string;
};

const TooltipItem = ({ label, value, color }: TooltipItemProps) => (
  <div className="flex items-center justify-between gap-x-4">
    <div className="flex items-center gap-x-2">
      <div className={`size-1.5 rounded-full ${color}`} aria-hidden="true" />
      <p className="text-muted-foreground text-sm">{label}</p>
    </div>
    <p className="text-right text-sm font-medium">{value}</p>
  </div>
);

export const TooltipBase = ({ title, children }: TooltipBaseProps) => (
  <div className="dark:bg-background overflow-hidden rounded-sm border bg-white shadow-sm">
    <div className="bg-muted text-muted-foreground p-2 px-3 text-sm">
      {title}
    </div>
    <Separator />
    <div className="space-y-1 p-2 px-3">{children}</div>
  </div>
);

TooltipBase.Item = TooltipItem;
