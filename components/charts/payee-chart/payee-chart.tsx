"use client";

import { FileSearch, Users } from "lucide-react";

import { SpendingPieLoading } from "@/components/loading/spending-pie-loading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetPayeeSummary } from "@/features/summary/api/use-get-payee-summary";
import { formatCurrency } from "@/lib/utils";

export const PayeeChart = () => {
  const { data = [], isLoading } = useGetPayeeSummary({
    type: "Expense",
    top: 10,
  });

  if (isLoading) return <SpendingPieLoading />;

  const max = data.reduce((m, r) => Math.max(m, r.value), 0);

  return (
    <Card className="border-none drop-shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-4 lg:p-6">
        <CardTitle className="line-clamp-1 text-base">
          Top payees{" "}
          <span className="text-muted-foreground font-normal">
            &middot; expenses
          </span>
        </CardTitle>

        <Users className="text-muted-foreground size-4" />
      </CardHeader>

      <CardContent className="p-4 pt-0 lg:p-6">
        {data.length === 0 ? (
          <div className="flex h-[350px] w-full flex-col items-center justify-center gap-y-4">
            <FileSearch className="text-muted-foreground size-6" />

            <p className="text-muted-foreground text-sm">
              No data for this period.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {data.map((row, i) => {
              const pct = max > 0 ? (row.value / max) * 100 : 0;

              return (
                <li key={`${row.name}-${i}`} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="line-clamp-1 font-medium">
                      {row.name || "Unknown"}
                    </span>

                    <span className="text-muted-foreground tabular-nums">
                      {formatCurrency(row.value)}
                    </span>
                  </div>

                  <div className="bg-muted relative h-2 w-full overflow-hidden rounded-full">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-rose-500/80"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};
