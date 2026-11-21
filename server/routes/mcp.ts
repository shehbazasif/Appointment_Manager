import { getRequestHeader, readBody, setHeader, setResponseStatus } from "h3";
import { BRAND } from "../../shared/utils/brand";
import { publicOrigin } from "../utils/agentContent";
import { AGENT_TOOLS, agentToolList } from "../utils/agentTools";

/**
 * A small, read-only MCP server (Streamable HTTP, stateless, JSON responses).
 * No sign-in; it only returns public information. Described at
 * /.well-known/mcp/server-card.json.
 */
export const MCP_VERSION = "1.0.0";
const PROTOCOLS = ["2025-06-18", "2025-03-26", "2024-11-05"];

type RpcRequest = { jsonrpc?: string; id?: string | number | null; method?: string; params?: any };

const result = (id: RpcRequest["id"], value: unknown) => ({ jsonrpc: "2.0", id: id ?? null, result: value });
const failure = (id: RpcRequest["id"], code: number, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

const handle = async (req: RpcRequest, origin: string) => {
  // notifications (no id) get no answer
  const isNotification = req.id === undefined;
  switch (req.method) {
    case "initialize": {
      const asked = String(req.params?.protocolVersion ?? "");
      return result(req.id, {
        protocolVersion: PROTOCOLS.includes(asked) ? asked : PROTOCOLS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: `${BRAND.name.toLowerCase()}-public`, title: `${BRAND.name} (public info)`, version: MCP_VERSION },
        instructions: `Read-only information about ${BRAND.name} (online booking and appointment software): overview, pricing, and public booking pages of businesses. Nothing here can book or change anything; send people to the bookingUrl to book.`,
      });
    }
    case "ping":
      return result(req.id, {});
    case "tools/list":
      return result(req.id, { tools: agentToolList() });
    case "tools/call": {
      const tool = AGENT_TOOLS.find((t) => t.name === req.params?.name);
      if (!tool) return failure(req.id, -32602, `Unknown tool: ${String(req.params?.name ?? "")}`);
      try {
        const data = await tool.run((req.params?.arguments ?? {}) as Record<string, unknown>, origin);
        return result(req.id, {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
          structuredContent: data,
          isError: false,
        });
      } catch (e: any) {
        return result(req.id, { content: [{ type: "text", text: e?.message ?? "Something went wrong." }], isError: true });
      }
    }
    case "resources/list":
      return result(req.id, { resources: [] });
    case "prompts/list":
      return result(req.id, { prompts: [] });
    default:
      if (isNotification) return null;
      return failure(req.id, -32601, `Method not found: ${String(req.method ?? "")}`);
  }
};

export default defineEventHandler(async (event) => {
  // public, read-only: any origin may call it from a browser
  setHeader(event, "Access-Control-Allow-Origin", "*");
  setHeader(event, "Access-Control-Allow-Headers", "Content-Type, Accept, Mcp-Session-Id, Mcp-Protocol-Version");
  setHeader(event, "Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  if (event.method === "OPTIONS") {
    setResponseStatus(event, 204);
    return "";
  }
  if (event.method !== "POST") {
    // no server-to-client stream (stateless server)
    setResponseStatus(event, 405);
    setHeader(event, "Allow", "POST, OPTIONS");
    return { error: "Use POST with a JSON-RPC message. See /.well-known/mcp/server-card.json." };
  }

  const contentType = String(getRequestHeader(event, "content-type") ?? "");
  if (!contentType.includes("application/json")) {
    setResponseStatus(event, 415);
    return failure(null, -32700, "Send JSON (Content-Type: application/json).");
  }
  let body: unknown;
  try {
    body = await readBody(event);
  } catch {
    setResponseStatus(event, 400);
    return failure(null, -32700, "Parse error.");
  }

  const origin = publicOrigin(event);
  setHeader(event, "Content-Type", "application/json");
  if (Array.isArray(body)) {
    if (body.length > 20) return failure(null, -32600, "Too many messages in one batch.");
    const answers = (await Promise.all(body.map((m) => handle(m as RpcRequest, origin)))).filter(Boolean);
    if (!answers.length) {
      setResponseStatus(event, 202);
      return "";
    }
    return answers;
  }
  if (!body || typeof body !== "object") return failure(null, -32600, "Invalid request.");
  const answer = await handle(body as RpcRequest, origin);
  if (!answer) {
    setResponseStatus(event, 202);
    return "";
  }
  return answer;
});
