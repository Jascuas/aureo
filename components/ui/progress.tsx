"use client";

import * as ProgressPrimitive from "@radix-ui/react-progress";
import * as React from "react";

import { cn } from "@/lib/utils";

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn("relative h-3 w-full overflow-hidden", className)}
    style={{
      background: `repeating-linear-gradient(
        90deg,
        var(--crt-surface-2) 0px,
        var(--crt-surface-2) 3px,
        var(--crt-bg) 3px,
        var(--crt-bg) 6px
      )`,
      border: "1px solid var(--crt-border)",
    }}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="animate-sweep relative h-full flex-1 transition-all"
      style={{
        transform: `translateX(-${100 - (value || 0)}%)`,
        background: "var(--crt-accent)",
      }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
