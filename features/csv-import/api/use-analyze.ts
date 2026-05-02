import { useMutation } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";

import { client } from "@/lib/hono";

type SuccessResponse = InferResponseType<
  (typeof client.api)["csv-import"]["analyze"]["$post"],
  200
>;
type ResponseType = SuccessResponse["data"];
type RequestType = InferRequestType<
  (typeof client.api)["csv-import"]["analyze"]["$post"]
>["json"];

export const useAnalyze = () => {
  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (json) => {
      const response = await client.api["csv-import"]["analyze"]["$post"]({
        json,
      });

      if (!response.ok) {
        throw new Error("Failed to analyze transactions");
      }

      const result = await response.json();
      if (!("data" in result)) {
        throw new Error("Unexpected response shape");
      }
      return result.data;
    },
  });

  return mutation;
};
