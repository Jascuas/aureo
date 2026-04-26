"use client";

import { Check, ChevronsUpDown, Sparkles } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCategoryTree } from "@/features/categories/hooks/use-category-tree";
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
  const { topSuggestion, groups, isLoading } = useCategoryTree(suggestions);

  // Resolve current category display name
  const categoryName = (() => {
    if (!categoryId) return null;
    if (topSuggestion?.id === categoryId) return topSuggestion.name;
    for (const group of groups) {
      const found = group.items.find((item) => item.id === categoryId);
      if (found) return found.name;
    }
    return null;
  })();

  const displayName = categoryName ?? "Uncategorized";
  const isLowConfidence = confidence < 0.7;

  const handleSelect = (id: string, name: string) => {
    onCategoryChange(id, name);
    setOpen(false);
  };

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

      <PopoverContent
        className="w-72 p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {isLoading ? (
          <div className="text-muted-foreground p-3 text-sm">Loading…</div>
        ) : (
          <Command>
            <CommandInput placeholder="Search categories…" />
            <CommandList>
              <CommandEmpty>No categories found.</CommandEmpty>

              {topSuggestion && (
                <>
                  <CommandGroup heading="Top Suggestion">
                    <CommandItem
                      value={`${topSuggestion.path}::${topSuggestion.id}`}
                      onSelect={() =>
                        handleSelect(topSuggestion.id, topSuggestion.name)
                      }
                      onPointerDown={(e) => e.preventDefault()}
                      className="gap-2"
                    >
                      <Check
                        className={cn(
                          "size-4 shrink-0",
                          categoryId === topSuggestion.id
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                      <Sparkles className="text-muted-foreground size-3 shrink-0" />
                      <span className="flex-1 truncate">
                        {topSuggestion.name}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {Math.round(topSuggestion.confidence * 100)}%
                      </span>
                    </CommandItem>
                  </CommandGroup>
                  <CommandSeparator />
                </>
              )}

              {groups.map((group, i) => (
                <div key={group.rootName}>
                  {i > 0 && <CommandSeparator />}
                  <CommandGroup heading={group.rootName}>
                    {group.items.map((item) => (
                      <CommandItem
                        key={item.id}
                        value={`${item.path}::${item.id}`}
                        onSelect={() => handleSelect(item.id, item.name)}
                        onPointerDown={(e) => e.preventDefault()}
                        style={
                          item.depth > 0
                            ? { paddingLeft: `${8 + item.depth * 14}px` }
                            : undefined
                        }
                        className="gap-2"
                      >
                        <Check
                          className={cn(
                            "size-4 shrink-0",
                            categoryId === item.id
                              ? "opacity-100"
                              : "opacity-0",
                          )}
                        />
                        <span className="truncate">{item.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </div>
              ))}
            </CommandList>
          </Command>
        )}
      </PopoverContent>
    </Popover>
  );
};
