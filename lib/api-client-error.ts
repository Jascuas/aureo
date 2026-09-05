const ERROR_MESSAGES_BY_STATUS: Record<number, string> = {
  400: "Revisa los datos introducidos e inténtalo de nuevo.",
  401: "Tu sesión ha caducado. Inicia sesión de nuevo para continuar.",
  403: "No tienes permiso para realizar esta acción.",
  404: "El registro ya no existe o no está disponible.",
  409: "No se pudo completar la acción porque el registro ha cambiado.",
};

export class MutationHttpError extends Error {}

export const getMutationErrorMessage = (
  source: unknown,
  fallback: string,
) => {
  if (source instanceof Response) {
    return ERROR_MESSAGES_BY_STATUS[source.status] ?? fallback;
  }

  if (source instanceof MutationHttpError) {
    return source.message;
  }

  return fallback;
};
