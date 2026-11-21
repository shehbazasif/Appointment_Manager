import { setHeader } from "h3";
import { homeMarkdown, publicOrigin } from "../utils/agentContent";

/** The home page as Markdown (the same text agents get with Accept: text/markdown). */
export default defineEventHandler((event) => {
  setHeader(event, "Content-Type", "text/markdown; charset=utf-8");
  setHeader(event, "Cache-Control", "public, max-age=3600");
  return homeMarkdown(publicOrigin(event));
});
