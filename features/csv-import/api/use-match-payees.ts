import { useMutation } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

import { client } from "@/lib/hono";

type ResponseType = InferResponseType<
  (typeof client.api)["csv-import"]["match-payees"]["$post"]
>;
type RequestType = InferRequestType<
  (typeof client.api)["csv-import"]["match-payees"]["$post"]
>["json"];

export const useMatchPayees = () => {
  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (json) => {
      const response = await client.api["csv-import"]["match-payees"]["$post"]({
        json,
      });

      if (!response.ok) {
        throw new Error("Failed to match payees");
      }

      return await response.json();
    },
    onError: () => {
      toast.error("Failed to match payees from history.");
    },
  });

  return mutation;
};
