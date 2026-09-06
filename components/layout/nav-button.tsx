import Link from "next/link";

import { cn } from "@/lib/utils";

type NavButtonProps = {
  href: string;
  label: string;
  isActive: boolean;
  onClick?: () => void;
};

export const NavButton = ({
  href,
  label,
  isActive,
  onClick,
}: NavButtonProps) => {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "group flex min-h-11 items-center gap-2 border-l-4 px-4 py-3 text-xs tracking-wide uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        isActive
          ? "bg-secondary text-foreground glow-sm border-crt-accent"
          : "text-muted-foreground hover:border-border hover:bg-secondary border-transparent",
      )}
    >
      {/* Active glyph */}
      <span
        className={cn(
          "shrink-0 text-sm leading-none",
          isActive ? "glow-acc text-crt-accent" : "text-crt-dim opacity-60",
        )}
      >
        {isActive ? "▶" : ">"}
      </span>
      <span>{label}</span>
    </Link>
  );
};
