import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

import { client } from "@/lib/hono";

type ResponseType = InferResponseType<typeof client.api["csv-import"]["import"]["$post"]>;
type RequestType = InferRequestType<typeof client.api["csv-import"]["import"]["$post"]>["json"];

export const useBulkImportTransactions = () => {
  const queryClient = useQueryClient();

  return useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (json) => {
      const response = await client.api["csv-import"]["import"].$post({ json });
      if (!response.ok) {
        throw new Error("Failed to import transactions");
      }
      return await response.json();
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
