import { Filters } from "@/components/filters/filters";
import { Navigation } from "@/components/layout/navigation";

type TopbarProps = {
  showFilters?: boolean;
};

export const Topbar = ({ showFilters = true }: TopbarProps) => {
  return (
    <header className="border-border bg-background/92 sticky top-0 z-20 flex shrink-0 flex-col border-b p-3 backdrop-blur-sm">
      {/* Mobile row: logo + hamburger */}
      <div className="flex items-center justify-between pb-3 lg:hidden">
        <span className="text-muted-foreground text-2xs tracking-widest uppercase">
          &gt; AUREO_
        </span>
        <Navigation />
      </div>

      {showFilters && <Filters />}
    </header>
  );
};
