import type { NextFunction, Request, Response } from "express";

export function errorMiddleware(
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
): void {
  console.error("Error del API Gateway:", error);

  if (error instanceof DOMException && error.name === "TimeoutError") {
    response.status(504).json({
      statusCode: 504,
      message: "El servicio de pagos excedio el tiempo de espera",
      error: "Gateway Timeout",
    });
    return;
  }

  if (isConnectionError(error)) {
    response.status(503).json({
      statusCode: 503,
      message: "El servicio de pagos no esta disponible",
      error: "Service Unavailable",
    });
    return;
  }

  response.status(502).json({
    statusCode: 502,
    message: "Error al comunicarse con el servicio de pagos",
    error: "Bad Gateway",
  });
}

function isConnectionError(error: unknown): boolean {
  if (!(error instanceof TypeError) || !("cause" in error)) {
    return false;
  }

  const cause = error.cause;

  return (
    typeof cause === "object" &&
    cause !== null &&
    "code" in cause &&
    (cause.code === "ECONNREFUSED" ||
      cause.code === "ENOTFOUND" ||
      cause.code === "EHOSTUNREACH")
  );
}
