import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL;
if (!url)
  throw new Error(
    "DATABASE_URL is required. Use your Supabase Postgres connection string (Project Settings → Database).",
  );

export default defineConfig({
  schema: "./server/db/schema.ts",
  out: "./server/db/migrations",
  dialect: "postgresql",
  dbCredentials: { url },
});
