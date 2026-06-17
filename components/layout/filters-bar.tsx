"use client";

import { usePathname } from "next/navigation";

import { Filters } from "@/components/filters/filters";

const FILTER_ROUTES = ["/", "/transactions"];

export const FiltersBar = () => {
  const pathname = usePathname();

  if (!FILTER_ROUTES.includes(pathname)) return null;

  return (
    <div className="border-border bg-background sticky top-0 z-10 border-b p-4 lg:p-6">
      <Filters />
    </div>
  );
};
