import "dotenv/config";
import { app } from "./app";

const DEFAULT_PORT = 3000;
const port = Number(process.env.PORT ?? DEFAULT_PORT);

if (!Number.isInteger(port) || port <= 0) {
  throw new Error("PORT Deberia de ser un número entero positivo");
}

app.listen(port, () => {
  console.log(`API Gateway corriendo en el puerto: ${port}`);
});
