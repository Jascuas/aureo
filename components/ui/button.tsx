import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-none text-[10px] font-bold uppercase tracking-[0.14em] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        default:
          "border border-crt-accent bg-transparent text-crt-accent hover:bg-crt-accent hover:text-background",
        destructive:
          "border border-destructive bg-transparent text-destructive hover:bg-destructive hover:text-background",
        outline:
          "border border-border bg-transparent text-foreground hover:border-crt-accent hover:text-crt-accent",
        secondary:
          "border border-border bg-secondary text-foreground hover:bg-card",
        ghost:
          "bg-transparent text-muted-foreground hover:bg-secondary hover:text-foreground",
        link: "bg-transparent text-crt-accent underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-7 px-3",
        lg: "h-11 px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
