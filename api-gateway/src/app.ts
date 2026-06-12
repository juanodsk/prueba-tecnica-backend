import express, { type Request, type Response } from "express";
import { loggingMiddleware } from "./middlewares/logging.middleware";
import { authMiddleware } from "./middlewares/auth.middleware";
import { rateLimitMiddleware } from "./middlewares/rate-limit.middleware";
import { paymentProxy } from "./proxy/payment.proxy";
import { errorMiddleware } from "./middlewares/error.middleware";

export const app = express();

app.use(loggingMiddleware);
app.use(express.json());

app.get("/health", (_request: Request, response: Response) => {
  response.status(200).json({
    status: "ok",
    service: "api-gateway",
    timestamp: new Date().toISOString(),
  });
});
app.use("/api/v1", authMiddleware);
app.use("/api/v1", rateLimitMiddleware);
app.use("/api/v1/transactions", paymentProxy);
app.use("/api/v1/settlements", paymentProxy);
app.use(errorMiddleware);
