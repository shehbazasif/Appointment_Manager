import { createClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase admin client using the service role key.
 * This bypasses RLS so it can be used safely in authenticated server routes.
 */
export const getSupabaseAdmin = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_KEY;

  if (!url || !key) {
    throw createError({
      statusCode: 503,
      statusMessage: "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY.",
    });
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
};

export type SupabaseAdmin = ReturnType<typeof getSupabaseAdmin>;
