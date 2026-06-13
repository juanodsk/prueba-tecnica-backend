import type { NextFunction, Request, Response } from "express";
import { CircuitBreaker } from "../circuit-breaker/circuit-breaker";
import { env } from "../config/env";

const FORWARDED_REQUEST_HEADERS = [
  "x-api-key",
  "content-type",
  "authorization",
] as const;

const FORWARDED_RESPONSE_HEADERS = ["content-type"] as const;

const PAYMENT_FAILURE_THRESHOLD = 5;
const PAYMENT_RESET_TIMEOUT_MS = 30_000;

const paymentCircuitBreaker = new CircuitBreaker(
  PAYMENT_FAILURE_THRESHOLD,
  PAYMENT_RESET_TIMEOUT_MS,
);

export async function paymentProxy(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const downstreamPath = request.originalUrl.replace(/^\/api\/v1/, "");
    const downstreamUrl = new URL(downstreamPath, env.paymentServiceUrl);

    const downstreamResponse = await paymentCircuitBreaker.execute(
      () =>
        fetch(downstreamUrl, {
          method: request.method,
          headers: buildHeaders(request),
          body: buildBody(request),
          signal: AbortSignal.timeout(env.proxyTimeoutMs),
        }),
      (result) => result.status >= 500,
    );

    for (const headerName of FORWARDED_RESPONSE_HEADERS) {
      const headerValue = downstreamResponse.headers.get(headerName);

      if (headerValue) {
        response.setHeader(headerName, headerValue);
      }
    }

    const responseBody = Buffer.from(await downstreamResponse.arrayBuffer());

    response.status(downstreamResponse.status).send(responseBody);
  } catch (error: unknown) {
    next(error);
  }
}

function buildHeaders(request: Request): Headers {
  const headers = new Headers();

  for (const headerName of FORWARDED_REQUEST_HEADERS) {
    const headerValue = request.header(headerName);

    if (headerValue) {
      headers.set(headerName, headerValue);
    }
  }

  return headers;
}

function buildBody(request: Request): BodyInit | undefined {
  if (request.method === "GET" || request.method === "HEAD") {
    return undefined;
  }

  if (request.body === undefined) {
    return undefined;
  }

  return JSON.stringify(request.body);
}
