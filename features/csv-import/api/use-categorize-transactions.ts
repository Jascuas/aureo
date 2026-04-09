import { useMutation } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";
import { RateLimitError } from "@/lib/errors";

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
        // Extract error details from response
        const errorData = await response.json();

        // Check if it's a rate limit error (429)
        if (response.status === 429 && "error" in errorData) {
          throw new RateLimitError(
            errorData.error as string,
            (errorData as any).retryAfter,
            (errorData as any).provider,
          );
        }

        throw new Error("Failed to categorize transactions");
      }

      return await response.json();
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
