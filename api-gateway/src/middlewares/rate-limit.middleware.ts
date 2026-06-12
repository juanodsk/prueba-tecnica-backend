import type { NextFunction, Response } from "express";
import type { AuthenticatedRequest } from "../types/authenticated-request.type";

const MAX_REQUESTS = 100;
const WINDOW_MS = 60_000;
const CLEANUP_INTERVAL_MS = 60_000;

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const requestsByApiKey = new Map<string, RateLimitEntry>();

export function rateLimitMiddleware(
  request: AuthenticatedRequest,
  response: Response,
  next: NextFunction,
): void {
  const apiKey = request.header("x-api-key");

  if (!apiKey) {
    response.status(401).json({
      statusCode: 401,
      message: "API key requerida para aplicar rate limiting",
      error: "Unauthorized",
    });
    return;
  }

  const now = Date.now();
  const currentEntry = requestsByApiKey.get(apiKey);

  if (!currentEntry || currentEntry.resetAt <= now) {
    requestsByApiKey.set(apiKey, {
      count: 1,
      resetAt: now + WINDOW_MS,
    });

    next();
    return;
  }

  if (currentEntry.count >= MAX_REQUESTS) {
    const retryAfterSeconds = Math.ceil((currentEntry.resetAt - now) / 1000);

    response.setHeader("Retry-After", retryAfterSeconds.toString());
    response.status(429).json({
      statusCode: 429,
      message: "Limite de solicitudes excedido",
      error: "Too Many Requests",
    });
    return;
  }

  currentEntry.count += 1;
  next();
}

const cleanupInterval = setInterval(() => {
  const now = Date.now();

  for (const [apiKey, entry] of requestsByApiKey.entries()) {
    if (entry.resetAt <= now) {
      requestsByApiKey.delete(apiKey);
    }
  }
}, CLEANUP_INTERVAL_MS);

cleanupInterval.unref();
