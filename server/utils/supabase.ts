import { createClient } from "@supabase/supabase-js";
import { serverSupabaseClient } from "#supabase/server";

/**
 * Supabase client acting AS THE LOGGED-IN USER (their JWT forwarded to Postgres).
 * RLS policies (scripts/rls-setup.sql) enforce that a user can only touch
 * their own business's data. No service_role key is used anywhere in the app.
 */
export const getUserClient = async (event: Parameters<typeof serverSupabaseClient>[0]) =>
  serverSupabaseClient(event);

/**
 * Anonymous client for the public booking page (no login). It can only call
 * the narrow SECURITY DEFINER RPC functions created by scripts/rls-setup.sql —
 * all tenant tables reject anon reads/writes via RLS.
 */
export const getAnonClient = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  if (!url || !key) {
    throw createError({
      statusCode: 503,
      statusMessage:
        "Supabase is not configured. Set SUPABASE_URL and SUPABASE_KEY in .env.",
    });
  }
  return createClient(url, key, { auth: { persistSession: false } });
};

export type UserClient = Awaited<ReturnType<typeof getUserClient>>;
export type AnonClient = ReturnType<typeof getAnonClient>;
