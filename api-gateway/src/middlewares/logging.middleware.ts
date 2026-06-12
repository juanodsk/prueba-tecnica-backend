import type { NextFunction, Request, Response } from "express";

export function loggingMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const startedAt = process.hrtime.bigint();

  response.on("finish", () => {
    const elapsedNanoseconds = process.hrtime.bigint() - startedAt;
    const elapsedMilliseconds = Number(elapsedNanoseconds) / 1_000_000;

    console.log(
      `[${new Date().toISOString()}] ${request.method} ${request.originalUrl} ${response.statusCode} ${Math.round(elapsedMilliseconds)}ms`,
    );
  });

  next();
}
