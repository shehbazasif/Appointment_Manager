/**
 * An invitation being accepted in this tab. While it is open, every sign-in
 * screen (sign in, "use another account", the login code page) brings the
 * person back to the invitation instead of the normal business sign-in.
 */
export type PendingInvite = { token: string; business: string; email: string };
const KEY = "rv_invite";

export const getPendingInvite = (): PendingInvite | null => {
  try {
    const v = JSON.parse(sessionStorage.getItem(KEY) ?? "null");
    return v && typeof v.token === "string" && v.token ? v : null;
  } catch {
    return null;
  }
};
export const setPendingInvite = (v: PendingInvite | null) => {
  try {
    if (v) sessionStorage.setItem(KEY, JSON.stringify(v));
    else sessionStorage.removeItem(KEY);
  } catch {}
};
export const inviteUrl = (v: PendingInvite) => `/join?token=${encodeURIComponent(v.token)}`;
