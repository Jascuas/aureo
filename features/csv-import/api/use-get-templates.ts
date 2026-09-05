import { useQuery } from "@tanstack/react-query";

import type { ImportTemplate } from "@/features/csv-import/types/import-types";
import { client } from "@/lib/hono";

type ResponseType = ImportTemplate[];

export const useGetTemplates = (accountId?: string) => {
  const query = useQuery<ResponseType, Error>({
    queryKey: ["import-templates", accountId],
    queryFn: async () => {
      const response = await client.api["csv-import"]["templates"]["$get"](
        accountId ? { query: { accountId } } : undefined,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch import templates");
      }

      const result = await response.json();
      if (!("data" in result)) {
        throw new Error("Unexpected response shape");
      }
      return result.data;
    },
  });

  return query;
};
