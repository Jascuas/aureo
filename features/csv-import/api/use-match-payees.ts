import { useMutation } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

import { client } from "@/lib/hono";

type SuccessResponse = InferResponseType<
  (typeof client.api)["csv-import"]["match-payees"]["$post"],
  200
>;
type ResponseType = SuccessResponse["data"];
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

      const result = await response.json();
      if (!("data" in result)) {
        throw new Error("Unexpected response shape");
      }
      return result.data;
    },
    onError: () => {
      toast.error("Failed to match payees from history.");
    },
  });

  return mutation;
};
