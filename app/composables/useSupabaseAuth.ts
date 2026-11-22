import type { User } from "@supabase/supabase-js";

/**
 * Auth helpers built on the @nuxtjs/supabase module client.
 * `user` is kept in sync automatically (SSR from cookies, client via
 * onAuthStateChange), so pages can read it reactively.
 */
export function useSupabaseAuth() {
  const supabase = useSupabase();
  const user = useSupabaseUser();

  const refreshUser = async (): Promise<User | null> => {
    const {
      data: { user: currentUser },
      error,
    } = await supabase.auth.getUser();
    if (error || !currentUser) {
      user.value = null;
      return null;
    }
    user.value = currentUser;
    return currentUser;
  };

  const requireUser = async () => {
    const currentUser = user.value ?? (await refreshUser());
    if (!currentUser) throw new Error("Authentication required.");
    return currentUser;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    user.value = null;
    // forget the 2-step login code state of this account
    if (import.meta.client) {
      try {
        sessionStorage.removeItem("rv_login_code");
      } catch {}
      (window as any).__rvLoginCodeAutoSent = undefined;
    }
  };

  return { supabase, user, refreshUser, requireUser, signOut };
}
