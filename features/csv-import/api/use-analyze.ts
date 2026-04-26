import { useMutation } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";

import { client } from "@/lib/hono";

type ResponseType = InferResponseType<
  (typeof client.api)["csv-import"]["analyze"]["$post"]
>;
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

      return await response.json();
    },
  });

  return mutation;
};
