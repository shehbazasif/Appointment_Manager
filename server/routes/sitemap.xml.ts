import { getRequestURL, setHeader } from "h3";
import { HELP_DOCS } from "../../app/utils/help-docs";

/** Public pages listed for search engines. Origin follows the request host. */
const PAGES = [
  "/",
  "/features",
  "/how-it-works",
  "/industries",
  "/pricing",
  "/faq",
  "/about",
  "/contactus",
  "/help",
  "/register",
  "/login",
  "/privacy",
  "/terms",
];

export default defineEventHandler((event) => {
  const configured = String(useRuntimeConfig(event).public.siteUrl || "").replace(/\/+$/, "");
  const origin = configured || getRequestURL(event, { xForwardedHost: true, xForwardedProto: true }).origin;
  const today = new Date().toISOString().slice(0, 10);
  const all = [...PAGES, ...HELP_DOCS.filter((d) => d.slug !== "introduction").map((d) => `/help/${d.slug}`)];
  const urls = all.map(
    (p) => `  <url><loc>${origin}${p === "/" ? "/" : p}</loc><lastmod>${today}</lastmod><priority>${p === "/" ? "1.0" : "0.7"}</priority></url>`,
  ).join("\n");
  setHeader(event, "Content-Type", "application/xml; charset=utf-8");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
});
