import { setHeader } from "h3";
import { llmsTxt, publicOrigin } from "../utils/agentContent";

/** https://llmstxt.org — a short guide to this site for AI agents. */
export default defineEventHandler((event) => {
  setHeader(event, "Content-Type", "text/markdown; charset=utf-8");
  setHeader(event, "Cache-Control", "public, max-age=3600");
  return llmsTxt(publicOrigin(event));
});
