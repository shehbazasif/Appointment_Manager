/**
 * Public origin used when building shareable links (e.g. booking URLs).
 * Prefers NUXT_PUBLIC_SITE_URL so links stay correct inside the native app
 * (where window.location.origin is a local webview origin), and falls back
 * to the current browser origin.
 */
export function getSiteOrigin(): string {
  const configured = String(useRuntimeConfig().public.siteUrl || "").trim();
  if (configured) return configured.replace(/\/+$/, "");
  if (import.meta.client) return window.location.origin;
  return "";
}
