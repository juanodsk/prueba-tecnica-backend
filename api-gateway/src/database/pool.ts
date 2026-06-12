import { Pool } from "pg";
import { env } from "../config/env";

export const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 10,
});

pool.on("error", (error: Error) => {
  console.error("Error inesperado en una conexion PostgreSQL inactiva:", error);
});
