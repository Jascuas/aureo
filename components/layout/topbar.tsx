import { Navigation } from "@/components/layout/navigation";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export const Topbar = () => {
  return (
    <header className="border-border bg-background/92 sticky top-0 z-20 flex shrink-0 flex-col border-b px-4 py-3 drop-shadow-sm backdrop-blur-sm lg:hidden">
      {/* Mobile row: logo + hamburger */}
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-2xs tracking-widest uppercase">
          &gt; AUREO_
        </span>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Navigation />
        </div>
      </div>
    </header>
  );
};
