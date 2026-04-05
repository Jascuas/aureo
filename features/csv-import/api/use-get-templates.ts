import { useQuery } from "@tanstack/react-query";
import { InferResponseType } from "hono";

import { client } from "@/lib/hono";

type ResponseType = InferResponseType<
  (typeof client.api)["csv-import"]["templates"]["$get"]
>;

export const useGetTemplates = (accountId?: string) => {
  const query = useQuery<ResponseType, Error>({
    queryKey: ["import-templates", accountId],
    queryFn: async () => {
      const response = await client.api["csv-import"]["templates"]["$get"](
        accountId ? { query: { accountId } } : undefined
      );

      if (!response.ok) {
        throw new Error("Failed to fetch import templates");
      }

      return await response.json();
    },
  });

  return query;
};
