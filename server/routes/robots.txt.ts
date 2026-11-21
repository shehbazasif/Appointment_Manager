import { getRequestURL, setHeader } from "h3";

/** Allow the public site, keep the private app out of search results. */
export default defineEventHandler((event) => {
  const configured = String(useRuntimeConfig(event).public.siteUrl || "").replace(/\/+$/, "");
  const origin = configured || getRequestURL(event, { xForwardedHost: true, xForwardedProto: true }).origin;
  setHeader(event, "Content-Type", "text/plain; charset=utf-8");
  return [
    // How the content may be used (https://contentsignals.org): show it in
    // search and in AI answers, but do not use it to train AI models.
    "# Content signals: search=yes (search results), ai-input=yes (AI answers with a link), ai-train=no (no AI training)",
    "User-agent: *",
    "Content-Signal: search=yes, ai-input=yes, ai-train=no",
    "Allow: /",
    "Disallow: /dashboard",
    "Disallow: /admin",
    "Disallow: /api/",
    "Disallow: /confirm",
    "Disallow: /logout",
    "",
    `Sitemap: ${origin}/sitemap.xml`,
    `# Guide for AI agents: ${origin}/llms.txt`,
    "",
  ].join("\n");
});
