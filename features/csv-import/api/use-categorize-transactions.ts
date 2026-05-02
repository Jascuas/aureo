import { useMutation } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";
import { RateLimitError } from "@/lib/errors";

import { client } from "@/lib/hono";

type SuccessResponse = InferResponseType<
  (typeof client.api)["csv-import"]["categorize"]["$post"],
  200
>;
type ResponseType = SuccessResponse["data"];
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
        const errorData = (await response.json()) as {
          error?: string;
          retryAfter?: number;
          provider?: string;
        };

        if (response.status === 429 && "error" in errorData) {
          throw new RateLimitError(
            errorData.error as string,
            errorData.retryAfter,
            errorData.provider,
          );
        }

        throw new Error("Failed to categorize transactions");
      }

      const result = await response.json();
      if (!("data" in result)) {
        throw new Error("Unexpected response shape");
      }
      return result.data;
    },
    onError: (error) => {
      // Don't show toast for rate limit errors (handled in UI)
      if (!(error instanceof RateLimitError)) {
        toast.error("Failed to categorize transactions.");
      }
    },
  });

  return mutation;
};
