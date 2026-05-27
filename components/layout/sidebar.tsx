"use client";

import { ClerkLoaded, ClerkLoading, UserButton } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";

import { HeaderLogo } from "@/components/layout/header-logo";
import { Navigation } from "@/components/layout/navigation";

export const Sidebar = () => {
  return (
    <aside className="animate-flicker border-border bg-card hidden h-screen w-60 shrink-0 flex-col border-r lg:flex">
      <div className="border-border flex h-14 shrink-0 items-center border-b px-4">
        <HeaderLogo />
      </div>

      <div className="border-border grid grid-cols-2 border-b">
        <div className="border-border flex flex-col gap-0.5 border-r px-3 py-2">
          <span className="text-muted-foreground text-3xs tracking-widest uppercase">
            STATUS
          </span>
          <span className="glow-pos text-2xs text-crt-pos font-bold uppercase">
            ONLINE
          </span>
        </div>
        <div className="flex flex-col gap-0.5 px-3 py-2">
          <span className="text-muted-foreground text-3xs tracking-widest uppercase">
            MODE
          </span>
          <span className="text-2xs text-crt-amber font-bold uppercase">
            LIVE
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-3">
        <div className="text-3xs text-crt-dim mb-1 px-4 tracking-widest uppercase">
          NAVIGATION
        </div>
        <Navigation />
      </div>

      <div className="border-border flex shrink-0 items-center gap-3 border-t px-4 py-3">
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
    </aside>
  );
};
