import type { Merchant } from "../types/merchant.type";
import { pool } from "./pool";

export async function findMerchantByApiKey(
  apiKey: string,
): Promise<Merchant | null> {
  const result = await pool.query<Merchant>(
    `
      SELECT
        id,
        name,
        email,
        api_key AS "apiKey",
        status
      FROM merchants
      WHERE api_key = $1
      LIMIT 1
    `,
    [apiKey],
  );

  return result.rows[0] ?? null;
}

export async function findMerchantById(
  merchantId: string,
): Promise<Merchant | null> {
  const result = await pool.query<Merchant>(
    `
      SELECT
        id,
        name,
        email,
        api_key AS "apiKey",
        status
      FROM merchants
      WHERE id = $1
      LIMIT 1
    `,
    [merchantId],
  );

  return result.rows[0] ?? null;
}
