import { getHeader, getRequestURL, setHeader } from "h3";
import { homeMarkdown, publicOrigin } from "../utils/agentContent";

/**
 * Home page, for AI agents:
 *  - a Link header (RFC 8288) pointing at llms.txt, the Markdown version and
 *    the MCP server card;
 *  - Markdown instead of HTML when the request asks for text/markdown.
 */
const wantsMarkdown = (accept: string) => {
  // text/markdown listed before (or ranked above) text/html
  const parts = accept.toLowerCase().split(",").map((p) => {
    const [type = "", ...params] = p.trim().split(";");
    const q = Number(params.find((x) => x.trim().startsWith("q="))?.split("=")[1] ?? 1);
    return { type: type.trim(), q: Number.isFinite(q) ? q : 1 };
  });
  const md = parts.find((p) => p.type === "text/markdown" || p.type === "text/x-markdown");
  if (!md || md.q <= 0) return false;
  const html = parts.find((p) => p.type === "text/html");
  return !html || md.q > html.q || (md.q === html.q && parts.indexOf(md) < parts.indexOf(html));
};

export default defineEventHandler((event) => {
  if (event.method !== "GET" && event.method !== "HEAD") return;
  if (getRequestURL(event).pathname !== "/") return;

  setHeader(
    event,
    "Link",
    [
      '</llms.txt>; rel="describedby"; type="text/markdown"',
      '</index.md>; rel="alternate"; type="text/markdown"',
      '</.well-known/mcp/server-card.json>; rel="service-desc"; type="application/json"',
      '</sitemap.xml>; rel="sitemap"; type="application/xml"',
    ].join(", "),
  );
  setHeader(event, "Vary", "Accept");

  if (wantsMarkdown(getHeader(event, "accept") ?? "")) {
    setHeader(event, "Content-Type", "text/markdown; charset=utf-8");
    setHeader(event, "Cache-Control", "public, max-age=3600");
    return homeMarkdown(publicOrigin(event));
  }
});
