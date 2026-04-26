"use client";

import { Check, ChevronsUpDown, Sparkles } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useGetCategories } from "@/features/categories/api/use-get-categories";
import { cn } from "@/lib/utils";

type CategorySuggestion = {
  categoryId: string;
  confidence: number;
};

type EditableCategoryCellProps = {
  categoryId: string | null;
  confidence: number;
  suggestions?: CategorySuggestion[];
  onCategoryChange: (
    categoryId: string | null,
    categoryName: string | null,
  ) => void;
};

export const EditableCategoryCell = ({
  categoryId,
  confidence,
  suggestions,
  onCategoryChange,
}: EditableCategoryCellProps) => {
  const [open, setOpen] = useState(false);
  const { data: categories, isLoading } = useGetCategories();

  const categoryName =
    categories?.find((c) => c.id === categoryId)?.name ?? null;
  const displayName = categoryName || "Uncategorized";
  const isLowConfidence = confidence < 0.7;

  const topSuggestions = (suggestions ?? [])
    .map((s) => ({
      ...s,
      categoryName:
        categories?.find((c) => c.id === s.categoryId)?.name ?? null,
    }))
    .filter(
      (
        s,
      ): s is {
        categoryId: string;
        confidence: number;
        categoryName: string;
      } => s.categoryName !== null,
    );

  const suggestedIds = new Set(topSuggestions.map((s) => s.categoryId));
  const remainingCategories =
    categories?.filter((c) => !suggestedIds.has(c.id)) ?? [];

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
      <PopoverContent className="w-55 p-0" align="start">
        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="text-muted-foreground p-2 text-sm">Loading...</div>
          ) : (
            <div className="p-1">
              {topSuggestions.length > 0 && (
                <>
                  <div className="text-muted-foreground flex items-center gap-1 px-2 py-1 text-xs font-medium">
                    <Sparkles className="size-3" />
                    Top Suggestions
                  </div>
                  {topSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.categoryId}
                      onClick={() => {
                        onCategoryChange(
                          suggestion.categoryId,
                          suggestion.categoryName,
                        );
                        setOpen(false);
                      }}
                      className={cn(
                        "hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm",
                        categoryId === suggestion.categoryId && "bg-accent",
                      )}
                    >
                      <Check
                        className={cn(
                          "size-4 shrink-0",
                          categoryId === suggestion.categoryId
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                      <span className="flex-1 truncate">
                        {suggestion.categoryName}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {Math.round(suggestion.confidence * 100)}%
                      </span>
                    </button>
                  ))}
                  <div className="bg-border my-1 h-px" />
                  <div className="text-muted-foreground px-2 py-1 text-xs font-medium">
                    All Categories
                  </div>
                </>
              )}

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

              {(topSuggestions.length > 0
                ? remainingCategories
                : categories
              )?.map((category) => (
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
