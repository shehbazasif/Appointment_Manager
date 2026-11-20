/**
 * Android app only (public.apiBase is set): the app is a tool, not the
 * marketing website. Website pages (home, features, pricing, help…) send the
 * person to the dashboard when signed in, otherwise to sign in.
 * Booking pages, legal pages, sign-in/up and the dashboard work as normal.
 * On the website (apiBase empty) this does nothing.
 */
const WEBSITE_PAGES = ["/", "/about", "/features", "/pricing", "/how-it-works", "/industries", "/faq", "/contactus"];

export default defineNuxtRouteMiddleware(async (to) => {
  if (!import.meta.client) return;
  const apiBase = String((useRuntimeConfig().public as any).apiBase || "");
  if (!apiBase) return;
  const isWebsitePage = WEBSITE_PAGES.includes(to.path) || to.path.startsWith("/help");
  if (!isWebsitePage) return;
  const { data } = await useSupabaseClient().auth.getSession();
  return navigateTo(data.session ? "/dashboard" : "/login", { replace: true });
});
