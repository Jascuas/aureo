"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSidebarStore } from "@/lib/use-sidebar-store";
import { cn } from "@/lib/utils";

export const SidebarToggleButton = () => {
  const { isOpen, toggle } = useSidebarStore();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      className={cn(
        "fixed bottom-[52px] z-50 hidden lg:flex",
        "bg-card border-border rounded-none border",
        "hover:border-crt-accent hover:text-crt-accent text-muted-foreground",
        "focus:border-crt-accent outline-none focus:ring-transparent focus:ring-offset-0",
        "transition-all duration-300 ease-in-out",
        isOpen ? "left-[277px]" : "left-[10px]",
      )}
    >
      {isOpen ? (
        <PanelLeftClose className="size-4" />
      ) : (
        <PanelLeftOpen className="size-4" />
      )}
    </Button>
  );
};
