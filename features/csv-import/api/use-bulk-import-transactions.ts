import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

import { client } from "@/lib/hono";

type SuccessResponse = InferResponseType<
  (typeof client.api)["csv-import"]["import"]["$post"],
  200
>;
type ResponseType = SuccessResponse["data"];
type RequestType = InferRequestType<
  (typeof client.api)["csv-import"]["import"]["$post"]
>["json"];

export const useBulkImportTransactions = () => {
  const queryClient = useQueryClient();

  return useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (json) => {
      const response = await client.api["csv-import"]["import"].$post({ json });
      if (!response.ok) {
        throw new Error("Failed to import transactions");
      }
      const result = await response.json();
      if (!("data" in result)) {
        throw new Error("Unexpected response shape");
      }
      return result.data;
    },
    onSuccess: () => {
      toast.success("Transactions imported successfully");
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["summary"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
    onError: () => {
      toast.error("Failed to import transactions");
    },
  });
};
