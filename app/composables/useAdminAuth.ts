import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { ref } from "vue";

/**
 * The platform admin has its OWN login, separate from the business login:
 * it is kept in its own browser storage slot and sent to /api/admin/* as
 * `Authorization: Bearer <token>`. So you can be signed in to a business
 * dashboard and to the admin panel at the same time, and signing out of one
 * does not sign you out of the other.
 */
let client: SupabaseClient | null = null;
const adminUser = ref<User | null>(null);
const ready = ref(false);

const getClient = () => {
  if (client) return client;
  const cfg = useRuntimeConfig().public.supabase as { url: string; key: string };
  client = createClient(cfg.url, cfg.key, {
    auth: {
      storageKey: "reventos-admin-session",
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
  client.auth.onAuthStateChange((_event, session) => {
    adminUser.value = session?.user ?? null;
  });
  return client;
};

const isAdminUser = (u: User | null | undefined) => (u?.app_metadata as any)?.platform_role === "SUPER_ADMIN";

export function useAdminAuth() {
  /** Load the saved admin session (call on page load). */
  const init = async () => {
    if (!import.meta.client) return null;
    const { data } = await getClient().auth.getSession();
    adminUser.value = data.session?.user ?? null;
    ready.value = true;
    return adminUser.value;
  };

  const signIn = async (email: string, password: string) => {
    const sb = getClient();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!isAdminUser(data.user)) {
      await sb.auth.signOut({ scope: "local" });
      throw new Error("This account does not have platform admin access.");
    }
    adminUser.value = data.user;
    return data.user;
  };

  /** Signs out of the admin panel only (the business login is not touched). */
  const signOut = async () => {
    await getClient().auth.signOut({ scope: "local" });
    adminUser.value = null;
  };

  /** $fetch for /api/admin/* using the admin's own token. */
  const adminFetch = async <T>(url: string, opts: Record<string, any> = {}): Promise<T> => {
    const { data } = await getClient().auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw Object.assign(new Error("Not signed in"), { statusCode: 401 });
    return $fetch<T>(url, { ...opts, headers: { ...(opts.headers ?? {}), Authorization: `Bearer ${token}` } });
  };

  // ---- Authenticator app (2-step login, required for the admin) ----

  /** "done" = signed in with the app code; "challenge" = ask for the code; "enroll" = first-time setup. */
  const mfaStep = async (): Promise<"done" | "challenge" | "enroll"> => {
    const sb = getClient();
    const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel === "aal2") return "done";
    const { data: f } = await sb.auth.mfa.listFactors();
    return (f?.totp ?? []).some((x) => x.status === "verified") ? "challenge" : "enroll";
  };

  /** First-time setup: returns the QR code (SVG data URL) and the text key. */
  const startEnroll = async () => {
    const sb = getClient();
    // remove half-finished setups from earlier attempts
    const { data: f } = await sb.auth.mfa.listFactors();
    for (const x of f?.all ?? []) {
      if (x.factor_type === "totp" && x.status !== "verified") await sb.auth.mfa.unenroll({ factorId: x.id });
    }
    const { data, error } = await sb.auth.mfa.enroll({ factorType: "totp", friendlyName: `Admin ${new Date().toISOString().slice(0, 10)}` });
    if (error) throw error;
    return { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
  };

  /** Check a 6-digit app code. factorId: the new factor (setup) or the existing one. */
  const verifyAppCode = async (code: string, factorId?: string) => {
    const sb = getClient();
    let id = factorId;
    if (!id) {
      const { data: f } = await sb.auth.mfa.listFactors();
      id = (f?.totp ?? []).find((x) => x.status === "verified")?.id;
    }
    if (!id) throw new Error("No authenticator is set up for this account.");
    const { error } = await sb.auth.mfa.challengeAndVerify({ factorId: id, code });
    if (error) throw new Error(error.message?.toLowerCase().includes("invalid") ? "Wrong code. Use the newest code from the app." : error.message);
    const { data } = await sb.auth.getSession();
    adminUser.value = data.session?.user ?? null;
  };

  return { adminUser, ready, init, signIn, signOut, adminFetch, isAdminUser, mfaStep, startEnroll, verifyAppCode };
}
