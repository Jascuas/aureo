import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

import { getApiErrorMessage } from "@/features/csv-import/api/get-api-error-message";
import { client } from "@/lib/hono";

type SuccessResponse = InferResponseType<
  (typeof client.api)["csv-import"]["templates"][":id"]["$patch"],
  200
>;
type ResponseType = SuccessResponse["data"];
type JsonBody = InferRequestType<
  (typeof client.api)["csv-import"]["templates"][":id"]["$patch"]
>["json"];

type RequestType = { id: string; json: JsonBody };

export const useUpdateTemplate = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ id, json }) => {
      const response = await client.api["csv-import"]["templates"][":id"][
        "$patch"
      ]({
        json,
        param: { id },
      });

      if (!response.ok) {
        throw new Error(
          getApiErrorMessage(
            await response.json(),
            "No se ha podido actualizar la plantilla",
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
      toast.success("Plantilla actualizada");
      queryClient.invalidateQueries({ queryKey: ["import-templates"] });
    },
    onError: (error) => {
      toast.error(error.message || "No se ha podido actualizar la plantilla");
    },
  });

  return mutation;
};
