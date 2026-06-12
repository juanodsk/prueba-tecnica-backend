import type { NextFunction, Response } from "express";
import jwt, { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import {
  findMerchantByApiKey,
  findMerchantById,
} from "../database/merchant.repository";
import { env } from "../config/env";
import type { AuthenticatedRequest } from "../types/authenticated-request.type";
import type { Merchant } from "../types/merchant.type";
import type { MerchantJwtPayload } from "../types/jwt-payload.type";

export async function authMiddleware(
  request: AuthenticatedRequest,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authorization = request.header("authorization");

    const merchant = authorization
      ? await authenticateWithJwt(authorization, request)
      : await authenticateWithApiKey(request);

    if (!merchant) {
      response.status(401).json({
        statusCode: 401,
        message: "Credenciales invalidas",
        error: "Unauthorized",
      });
      return;
    }

    if (merchant.status === "inactive") {
      response.status(403).json({
        statusCode: 403,
        message: "Merchant inactivo",
        error: "Forbidden",
      });
      return;
    }

    request.merchant = merchant;
    request.headers["x-api-key"] = merchant.apiKey;

    next();
  } catch (error: unknown) {
    if (
      error instanceof JsonWebTokenError ||
      error instanceof TokenExpiredError
    ) {
      response.status(401).json({
        statusCode: 401,
        message: "JWT invalido o expirado",
        error: "Unauthorized",
      });
      return;
    }

    console.error("Error durante la autenticacion:", error);

    response.status(503).json({
      statusCode: 503,
      message: "Servicio de autenticacion no disponible",
      error: "Service Unavailable",
    });
  }
}

async function authenticateWithJwt(
  authorization: string,
  request: AuthenticatedRequest,
): Promise<Merchant | null> {
  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    throw new JsonWebTokenError("Formato Authorization invalido");
  }

  const payload = jwt.verify(token, env.jwtSecret, {
    algorithms: ["HS256"],
  });

  if (typeof payload === "string" || typeof payload.merchantId !== "string") {
    throw new JsonWebTokenError("JWT sin merchantId");
  }

  request.jwtPayload = payload;

  return findMerchantById(payload.merchantId);
}

async function authenticateWithApiKey(
  request: AuthenticatedRequest,
): Promise<Merchant | null> {
  const apiKey = request.header("x-api-key");

  if (!apiKey) {
    return null;
  }

  return findMerchantByApiKey(apiKey);
}
