import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";

import type { TransactionTypeName } from "@/features/transaction-types/lib/transaction-types";
import { client } from "@/lib/hono";

import { summaryQueryKeys } from "./query-keys";

type PayeeSummaryType = TransactionTypeName;

type Options = {
  type?: PayeeSummaryType;
  top?: number;
};

/** Fetches top payees ranked by amount over the active period. */
export function useGetPayeeSummary({
  type = "Expense",
  top = 10,
}: Options = {}) {
  const params = useSearchParams();
  const from = params.get("from") ?? undefined;
  const to = params.get("to") ?? undefined;
  const accountId = params.get("accountId") ?? undefined;
  const topStr = String(top);

  return useQuery({
    queryKey: summaryQueryKeys.byPayee({
      type,
      from,
      to,
      accountId,
      top: topStr,
    }),
    queryFn: async () => {
      const res = await client.api.summary["by-payee"].$get({
        query: { type, from, to, accountId, top: topStr },
      });

      if (!res.ok) throw new Error("Failed to fetch payee summary.");

      return (await res.json()).data;
    },
  });
}
