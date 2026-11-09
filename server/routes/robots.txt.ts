import { getRequestURL, setHeader } from "h3";

/** Allow the public site, keep the private app out of search results. */
export default defineEventHandler((event) => {
  const configured = String(useRuntimeConfig(event).public.siteUrl || "").replace(/\/+$/, "");
  const origin = configured || getRequestURL(event, { xForwardedHost: true, xForwardedProto: true }).origin;
  setHeader(event, "Content-Type", "text/plain; charset=utf-8");
  return [
    "User-agent: *",
    "Allow: /",
    "Disallow: /dashboard",
    "Disallow: /admin",
    "Disallow: /api/",
    "Disallow: /confirm",
    "Disallow: /logout",
    "",
    `Sitemap: ${origin}/sitemap.xml`,
    "",
  ].join("\n");
});
