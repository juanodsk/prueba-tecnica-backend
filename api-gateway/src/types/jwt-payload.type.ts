import type { JwtPayload } from "jsonwebtoken";

export type MerchantJwtPayload = JwtPayload & {
  merchantId: string;
};
