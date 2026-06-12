import type { Request } from "express";
import type { JwtPayload } from "jsonwebtoken";
import type { Merchant } from "./merchant.type";

export type AuthenticatedRequest = Request & {
  merchant?: Merchant;
  jwtPayload?: JwtPayload;
};
