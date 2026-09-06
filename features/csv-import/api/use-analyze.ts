import { useMutation } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";

import { RateLimitError } from "@/lib/errors";
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
        const errorData = (await response.json()) as {
          error?: string;
          provider?: string;
          retryAfter?: number;
        };

        if (response.status === 429 && typeof errorData.error === "string") {
          throw new RateLimitError(
            errorData.error,
            errorData.retryAfter,
            errorData.provider,
          );
        }

        throw new Error("No se han podido analizar las transacciones.");
      }

      const result = await response.json();
      if (!("data" in result)) {
        throw new Error("La respuesta del servidor no tiene un formato válido.");
      }
      return result.data;
    },
  });

  return mutation;
};
