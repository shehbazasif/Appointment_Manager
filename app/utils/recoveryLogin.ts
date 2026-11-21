/**
 * True when this session was opened from a "reset your password" email in the
 * last hour. Supabase writes how the person signed in into the access token
 * ("amr"); a reset link signs in with method "recovery".
 */
export function isRecoveryLogin(accessToken?: string | null, maxAgeSeconds = 3600): boolean {
  if (!accessToken) return false;
  try {
    const part = accessToken.split(".")[1] ?? "";
    const json = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
    const amr: { method?: string; timestamp?: number }[] = Array.isArray(json.amr) ? json.amr : [];
    const rec = amr.find((a) => a?.method === "recovery");
    return !!rec && typeof rec.timestamp === "number" && Date.now() / 1000 - rec.timestamp < maxAgeSeconds;
  } catch {
    return false;
  }
}
