import { useQuery } from "@tanstack/react-query";

import { client } from "@/lib/hono";

export type AccountSummaryRow = {
  id: string;
  name: string;
  value: number;
};

/** Fetches per-account current balances for the donut chart. */
export function useGetAccountSummary() {
  return useQuery({
    queryKey: ["by-account"],
    queryFn: async (): Promise<AccountSummaryRow[]> => {
      const res = await client.api.summary["by-account"].$get();
      if (!res.ok) throw new Error("Failed to fetch account summary.");
      return (await res.json()).data;
    },
  });
}
