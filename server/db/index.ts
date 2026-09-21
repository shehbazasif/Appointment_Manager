import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

let database: ReturnType<typeof drizzle<typeof schema>> | undefined;

const sslFor = (connectionString: string) => {
  try {
    const url = new URL(connectionString);
    const local = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
    const disabled = url.searchParams.get("sslmode") === "disable";
    return !local && !disabled
      ? { rejectUnauthorized: false }
      : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Drizzle connection for the tenant database. Point DATABASE_URL at the
 * Supabase Postgres connection string (Project Settings → Database) or a
 * local Docker instance.
 */
export const getDatabase = () => {
  if (database) return database;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return undefined;
  const pool = new Pool({
    connectionString,
    ssl: sslFor(connectionString),
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
  });
  pool.on("error", (error) => console.error("Database pool error", error));
  database = drizzle(pool, { schema });
  return database;
};

export type Database = NonNullable<ReturnType<typeof getDatabase>>;
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type DbClient = Database | Transaction;
