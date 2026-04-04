import { useMutation } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

import { client } from "@/lib/hono";

type ResponseType = InferResponseType<
  (typeof client.api)["csv-import"]["detect-duplicates"]["$post"]
>;
type RequestType = InferRequestType<
  (typeof client.api)["csv-import"]["detect-duplicates"]["$post"]
>["json"];

export const useDetectDuplicates = () => {
  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (json) => {
      const response = await client.api["csv-import"]["detect-duplicates"]["$post"]({
        json,
      });

      if (!response.ok) {
        throw new Error("Failed to detect duplicates");
      }

      return await response.json();
    },
    onError: () => {
      toast.error("Failed to detect duplicates.");
    },
  });

  return mutation;
};
