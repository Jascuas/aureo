import { useMutation } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

import { client } from "@/lib/hono";

type ResponseType = InferResponseType<
  (typeof client.api)["csv-import"]["categorize"]["$post"]
>;
type RequestType = InferRequestType<
  (typeof client.api)["csv-import"]["categorize"]["$post"]
>["json"];

export const useCategorizeTransactions = () => {
  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (json) => {
      const response = await client.api["csv-import"]["categorize"]["$post"]({
        json,
      });

      if (!response.ok) {
        throw new Error("Failed to categorize transactions");
      }

      return await response.json();
    },
    onError: () => {
      toast.error("Failed to categorize transactions.");
    },
  });

  return mutation;
};
