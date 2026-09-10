import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import * as schema from "./schema";

let database: ReturnType<typeof drizzle<typeof schema>> | undefined;

export const getDatabase = () => {
  if (database) return database;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return undefined;
  const client = new Client({ connectionString });
  client
    .connect()
    .catch((error) => console.error("Database connection failed", error));
  database = drizzle(client, { schema });
  return database;
};

export type Database = NonNullable<ReturnType<typeof getDatabase>>;
