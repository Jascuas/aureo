import { ClerkLoaded, ClerkLoading, UserButton } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";

import { Filters } from "@/components/filters/filters";
import { HeaderLogo } from "@/components/layout/header-logo";
import { Navigation } from "@/components/layout/navigation";

type HeaderProps = {
  showFilters?: boolean;
};

export const Header = ({ showFilters = true }: HeaderProps) => {
  return (
    <header className="border-border bg-background border-b px-4 py-4 lg:px-14">
      <div className="mx-auto max-w-screen-2xl">
        <div className="mb-4 flex w-full items-center justify-between lg:mb-14">
          <div className="flex items-center lg:gap-x-16">
            <HeaderLogo />
            <Navigation />
          </div>

          <div className="flex items-center gap-x-2">
            <ClerkLoaded>
              <UserButton />
            </ClerkLoaded>

            <ClerkLoading>
              <Loader2 className="text-muted-foreground size-5 animate-spin" />
            </ClerkLoading>
          </div>
        </div>

        {showFilters && <Filters />}
      </div>
    </header>
  );
};
