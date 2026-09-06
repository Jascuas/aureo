import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

import { getApiErrorMessage } from "@/features/csv-import/api/get-api-error-message";
import { client } from "@/lib/hono";

type SuccessResponse = InferResponseType<
  (typeof client.api)["csv-import"]["templates"]["$post"],
  200
>;
type ResponseType = SuccessResponse["data"];
type RequestType = InferRequestType<
  (typeof client.api)["csv-import"]["templates"]["$post"]
>["json"];

export const useSaveTemplate = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (json) => {
      const response = await client.api["csv-import"]["templates"]["$post"]({
        json,
      });

      if (!response.ok) {
        throw new Error(
          getApiErrorMessage(
            await response.json(),
            "No se ha podido guardar la plantilla",
          ),
        );
      }

      const result = await response.json();
      if (!("data" in result)) {
        throw new Error("La respuesta del servidor no tiene un formato válido.");
      }
      return result.data;
    },
    onSuccess: () => {
      toast.success("Plantilla guardada correctamente");
      queryClient.invalidateQueries({ queryKey: ["import-templates"] });
    },
    onError: (error) => {
      toast.error(error.message || "No se ha podido guardar la plantilla");
    },
  });

  return mutation;
};
