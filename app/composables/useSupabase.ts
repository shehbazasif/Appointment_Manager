/**
 * Returns the shared SSR-aware Supabase client provided by @nuxtjs/supabase.
 * The module client keeps the session in cookies so Nitro server routes can
 * verify the user with `serverSupabaseUser`.
 */
export function useSupabase() {
  return useSupabaseClient();
}
