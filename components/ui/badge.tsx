import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-none border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        default: "border-border bg-secondary text-foreground",
        positive: "border-crt-pos bg-transparent text-crt-pos",
        negative: "border-destructive bg-transparent text-destructive",
        warning: "border-crt-amber bg-transparent text-crt-amber",
        accent: "border-crt-accent bg-transparent text-crt-accent",
        // legacy compat
        secondary: "border-border bg-secondary text-muted-foreground",
        destructive: "border-destructive bg-transparent text-destructive",
        outline: "border-border text-foreground",
        primary: "border-crt-accent bg-transparent text-crt-accent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
