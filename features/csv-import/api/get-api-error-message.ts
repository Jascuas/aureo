import { API_ERRORS } from "@/lib/api-errors";

const CSV_IMPORT_API_ERROR_MESSAGES: Record<string, string> = {
  [API_ERRORS.UNAUTHORIZED.error]:
    "No tienes autorización para realizar esta acción.",
  [API_ERRORS.NOT_FOUND.error]: "No se ha encontrado la plantilla.",
  [API_ERRORS.MISSING_ID.error]: "Falta el identificador de la plantilla.",
  [API_ERRORS.BAD_REQUEST.error]: "La solicitud no es válida.",
  [API_ERRORS.INTERNAL_SERVER_ERROR.error]:
    "Se ha producido un error interno. Inténtalo de nuevo.",
  [API_ERRORS.INVALID_FOREIGN_KEY.error]:
    "La categoría o el tipo de transacción no es válido.",
  [API_ERRORS.DUPLICATE_TEMPLATE_NAME.error]:
    "Ya existe una plantilla con este nombre.",
  [API_ERRORS.INVALID_ACCOUNT.error]: "No se ha encontrado la cuenta.",
};

export function getApiErrorMessage(payload: unknown, fallback: string): string {
  if (typeof payload !== "object" || payload === null || !("error" in payload)) {
    return fallback;
  }

  if (typeof payload.error !== "string" || !payload.error.trim()) {
    return fallback;
  }

  return CSV_IMPORT_API_ERROR_MESSAGES[payload.error] ?? payload.error;
}
