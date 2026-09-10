import { getDatabase, type Database } from "../db";

export const requireDatabase = (): Database => {
  const database = getDatabase();
  if (!database)
    throw createError({
      statusCode: 503,
      statusMessage:
        "Database is not configured. Set DATABASE_URL to enable this feature.",
    });
  return database;
};
