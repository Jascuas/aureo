import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";

import { client } from "@/lib/hono";

import type { CategorySummaryType } from "./use-get-category-summary";

type Options = {
  type?: CategorySummaryType;
  top?: number;
};

/** Fetches top payees ranked by amount over the active period. */
export function useGetPayeeSummary({
  type = "Expense",
  top = 10,
}: Options = {}) {
  const params = useSearchParams();
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const accountId = params.get("accountId") ?? "";
  const topStr = String(top);

  return useQuery({
    queryKey: ["by-payee", { type, from, to, accountId, top: topStr }],
    queryFn: async () => {
      const res = await client.api.summary["by-payee"].$get({
        query: { type, from, to, accountId, top: topStr },
      });

      if (!res.ok) throw new Error("Failed to fetch payee summary.");

      return (await res.json()).data;
    },
  });
}
