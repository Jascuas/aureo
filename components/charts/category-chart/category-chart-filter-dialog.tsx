"use client";

import { Filter } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CategorySummaryType } from "@/features/summary/api/use-get-category-summary";

export type CategoryFilterValue = {
  type: CategorySummaryType;
  top: number;
};

const TYPE_OPTIONS: { value: CategorySummaryType; label: string }[] = [
  { value: "Expense", label: "Expense" },
  { value: "Income", label: "Income" },
  { value: "Refund", label: "Refund" },
];

const TOP_OPTIONS = [3, 5, 10, 15, 20];

const DEFAULTS: CategoryFilterValue = { type: "Expense", top: 5 };

type Props = {
  value: CategoryFilterValue;
  onChange: (next: CategoryFilterValue) => void;
};

export const CategoryChartFilterDialog = ({ value, onChange }: Props) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<CategoryFilterValue>(value);

  // Sync draft whenever the dialog opens.
  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  const handleApply = () => {
    onChange(draft);
    setOpen(false);
  };

  const handleReset = () => setDraft(DEFAULTS);

  const isDirty = value.type !== DEFAULTS.type || value.top !== DEFAULTS.top;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="relative h-9 gap-2 rounded-md px-3"
        >
          <Filter className="size-4" />
          <span className="hidden sm:inline">Filters</span>
          {isDirty && (
            <span className="absolute top-1 right-1 size-2 rounded-full bg-blue-500" />
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Filter categories</DialogTitle>

          <DialogDescription>
            Customize what is shown on the categories chart.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 py-2">
          <div className="flex flex-col gap-2">
            <Label>Transaction type</Label>

            <Select
              value={draft.type}
              onValueChange={(v) =>
                setDraft((d) => ({ ...d, type: v as CategorySummaryType }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                {TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <p className="text-muted-foreground text-xs">
              Expense includes refunds (subtracted).
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Top categories</Label>

            <Select
              value={String(draft.top)}
              onValueChange={(v) => setDraft((d) => ({ ...d, top: Number(v) }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                {TOP_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    Top {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <p className="text-muted-foreground text-xs">
              Remaining categories are grouped into &quot;Other&quot;.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="ghost" onClick={handleReset}>
            Reset
          </Button>

          <Button type="button" onClick={handleApply}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const DEFAULT_CATEGORY_FILTER = DEFAULTS;
