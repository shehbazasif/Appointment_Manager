/**
 * WebMCP: tells AI agents running in the browser what they can do on this
 * site (navigator.modelContext). The tools are read-only and use the same
 * public MCP server as outside agents (/mcp), plus one to open a page.
 * Browsers without WebMCP simply skip this.
 */
type ToolResult = { content: { type: "text"; text: string }[]; isError?: boolean };

const callMcp = async (name: string, args: Record<string, unknown> = {}): Promise<ToolResult> => {
  try {
    const res = await fetch("/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }),
    });
    const data = await res.json();
    if (data?.error) return { content: [{ type: "text", text: String(data.error.message) }], isError: true };
    return data.result as ToolResult;
  } catch {
    return { content: [{ type: "text", text: "Could not reach the server." }], isError: true };
  }
};

const PAGES: Record<string, string> = {
  home: "/",
  features: "/features",
  pricing: "/pricing",
  industries: "/industries",
  faq: "/faq",
  help: "/help",
  contact: "/contactus",
  start_free_trial: "/register",
  sign_in: "/login",
};

export default defineNuxtPlugin(() => {
  const mc = (navigator as any).modelContext;
  if (!mc || (typeof mc.registerTool !== "function" && typeof mc.provideContext !== "function")) return;

  const empty = { type: "object", properties: {}, additionalProperties: false };
  const tools = [
    {
      name: "get_overview",
      description: `What ${BRAND.name} is, its features, who it is for and links to the main pages.`,
      inputSchema: empty,
      annotations: { readOnlyHint: true },
      execute: () => callMcp("get_overview"),
    },
    {
      name: "get_pricing",
      description: `${BRAND.name} plans, monthly and yearly prices, and the free trial.`,
      inputSchema: empty,
      annotations: { readOnlyHint: true },
      execute: () => callMcp("get_pricing"),
    },
    {
      name: "get_business_booking_page",
      description: `Public details of a business that takes bookings on ${BRAND.name} (services, prices, opening hours, booking link), by its booking-page slug.`,
      inputSchema: {
        type: "object",
        properties: { slug: { type: "string", description: "The part after /book/ in the business's booking link" } },
        required: ["slug"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: (args: { slug?: string }) => callMcp("get_business_booking_page", { slug: String(args?.slug ?? "") }),
    },
    {
      name: "open_page",
      description: `Open a page of the ${BRAND.name} website in this tab.`,
      inputSchema: {
        type: "object",
        properties: { page: { type: "string", enum: Object.keys(PAGES), description: "Which page to open" } },
        required: ["page"],
        additionalProperties: false,
      },
      execute: async (args: { page?: string }) => {
        const to = PAGES[String(args?.page ?? "")];
        if (!to) return { content: [{ type: "text" as const, text: "Unknown page." }], isError: true };
        await navigateTo(to);
        return { content: [{ type: "text" as const, text: `Opened ${to}` }] };
      },
    },
  ];

  try {
    if (typeof mc.registerTool === "function") for (const t of tools) mc.registerTool(t);
    else mc.provideContext({ tools });
  } catch {
    // an older or different WebMCP version: ignore
  }
});
