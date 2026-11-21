import { setHeader } from "h3";
import { BRAND } from "../../shared/utils/brand";
import { publicOrigin } from "../utils/agentContent";
import { agentToolList } from "../utils/agentTools";

/** MCP Server Card (SEP-1649) for the read-only MCP server at /mcp. */
export default defineEventHandler((event) => {
  const origin = publicOrigin(event);
  setHeader(event, "Content-Type", "application/json; charset=utf-8");
  setHeader(event, "Access-Control-Allow-Origin", "*");
  setHeader(event, "Cache-Control", "public, max-age=3600");
  const name = `${BRAND.name.toLowerCase()}-public`;
  const version = "1.0.0";
  return {
    $schema: "https://static.modelcontextprotocol.io/schemas/mcp-server-card/v1.json",
    version: "1.0",
    protocolVersion: "2025-06-18",
    name,
    title: `${BRAND.name} (public info)`,
    description: `Read-only facts about ${BRAND.name}, online booking and appointment software for small businesses: overview, pricing, and public booking pages of businesses.`,
    serverInfo: { name, title: `${BRAND.name} (public info)`, version },
    websiteUrl: origin,
    endpoint: `${origin}/mcp`,
    transport: { type: "streamable-http", endpoint: `${origin}/mcp` },
    remotes: [{ type: "streamable-http", url: `${origin}/mcp` }],
    capabilities: { tools: { listChanged: false } },
    authentication: { required: false, schemes: [] },
    tools: agentToolList(),
    contact: { email: BRAND.email },
  };
});
