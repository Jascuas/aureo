"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useGetCategories } from "@/features/categories/api/use-get-categories";
import { cn } from "@/lib/utils";

type EditableCategoryCellProps = {
  categoryId: string | null;
  confidence: number;
  onCategoryChange: (
    categoryId: string | null,
    categoryName: string | null,
  ) => void;
};

export const EditableCategoryCell = ({
  categoryId,
  confidence,
  onCategoryChange,
}: EditableCategoryCellProps) => {
  const [open, setOpen] = useState(false);
  const { data: categories, isLoading } = useGetCategories();

  const categoryName =
    categories?.find((c) => c.id === categoryId)?.name ?? null;
  const displayName = categoryName || "Uncategorized";
  const isLowConfidence = confidence < 0.7;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          aria-label={`Select category, current: ${displayName}`}
          className={cn(
            "w-full justify-between text-left font-normal",
            !categoryName && "text-muted-foreground",
            isLowConfidence && "text-rose-500",
          )}
        >
          <span className="truncate">{displayName}</span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <div className="max-h-[300px] overflow-y-auto">
          {isLoading ? (
            <div className="text-muted-foreground p-2 text-sm">Loading...</div>
          ) : (
            <div className="p-1">
              <button
                onClick={() => {
                  onCategoryChange(null, null);
                  setOpen(false);
                }}
                className={cn(
                  "hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm",
                  !categoryId && "bg-accent",
                )}
              >
                <Check
                  className={cn(
                    "size-4",
                    !categoryId ? "opacity-100" : "opacity-0",
                  )}
                />
                <span className="text-muted-foreground">Uncategorized</span>
              </button>

              {categories?.map((category) => (
                <button
                  key={category.id}
                  onClick={() => {
                    onCategoryChange(category.id, category.name);
                    setOpen(false);
                  }}
                  className={cn(
                    "hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm",
                    categoryId === category.id && "bg-accent",
                  )}
                >
                  <Check
                    className={cn(
                      "size-4",
                      categoryId === category.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span>{category.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
