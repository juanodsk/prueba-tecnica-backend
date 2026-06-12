import "dotenv/config";

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsedValue = Number(value ?? fallback);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error("Las variables numericas deben ser enteros positivos");
  }

  return parsedValue;
}

export const env = {
  port: positiveInteger(process.env.PORT, 3000),
  databaseUrl:
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@localhost:5432/payments",
  paymentServiceUrl: process.env.PAYMENT_SERVICE_URL ?? "http://localhost:3001",
  jwtSecret: process.env.JWT_SECRET ?? "PRUEBA_TECNICA_SECRET_KEY",
  proxyTimeoutMs: positiveInteger(process.env.PROXY_TIMEOUT_MS, 5000),
} as const;
