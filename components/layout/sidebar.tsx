"use client";

import { ClerkLoaded, ClerkLoading, UserButton } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";

import { HeaderLogo } from "@/components/layout/header-logo";
import { Navigation } from "@/components/layout/navigation";
import { useSidebarStore } from "@/lib/use-sidebar-store";
import { cn } from "@/lib/utils";

export const Sidebar = () => {
  const { isOpen } = useSidebarStore();

  return (
    <aside
      className={cn(
        "border-border hidden h-screen min-w-0 shrink-0 flex-col overflow-hidden border-r drop-shadow-sm transition-[width] duration-300 ease-in-out lg:flex",
        isOpen ? "w-60" : "w-0",
      )}
    >
      <div className="flex h-full w-60 flex-col">
        {/* h-[106px] matches topbar rendered height for border alignment */}
        <div className="border-border flex h-[106px] shrink-0 items-center border-b px-4">
          <HeaderLogo />
        </div>

        <div className="flex-1 overflow-y-auto">
          <Navigation />
        </div>

        <div className="border-border flex shrink-0 items-center gap-3 border-t p-4">
          <ClerkLoaded>
            <UserButton />
          </ClerkLoaded>
          <ClerkLoading>
            <Loader2 className="text-muted-foreground size-5 animate-spin" />
          </ClerkLoading>
          <span className="text-muted-foreground text-2xs tracking-wide uppercase">
            ACCOUNT
          </span>
        </div>
      </div>
    </aside>
  );
};
