import { useMutation } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

import { client } from "@/lib/hono";

type SuccessResponse = InferResponseType<
  (typeof client.api)["csv-import"]["detect-duplicates"]["$post"],
  200
>;
type ResponseType = SuccessResponse["data"];
type RequestType = InferRequestType<
  (typeof client.api)["csv-import"]["detect-duplicates"]["$post"]
>["json"];

export const useDetectDuplicates = () => {
  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (json) => {
      const response = await client.api["csv-import"]["detect-duplicates"][
        "$post"
      ]({
        json,
      });

      if (!response.ok) {
        throw new Error("Failed to detect duplicates");
      }

      const result = await response.json();
      if (!("data" in result)) {
        throw new Error("Unexpected response shape");
      }
      return result.data;
    },
    onError: () => {
      toast.error("Failed to detect duplicates.");
    },
  });

  return mutation;
};
