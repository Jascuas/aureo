import { useQuery } from "@tanstack/react-query";
import { InferResponseType } from "hono";

import { client } from "@/lib/hono";

type ResponseType = InferResponseType<
  (typeof client.api)["csv-import"]["templates"]["$get"]
>;

export const useGetTemplates = () => {
  const query = useQuery<ResponseType, Error>({
    queryKey: ["import-templates"],
    queryFn: async () => {
      const response = await client.api["csv-import"]["templates"]["$get"]();

      if (!response.ok) {
        throw new Error("Failed to fetch import templates");
      }

      return await response.json();
    },
  });

  return query;
};
