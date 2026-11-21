import { BRAND } from "../../shared/utils/brand";
import { getAnonClient } from "./supabase";
import { pricingOverview, productOverview } from "./agentContent";

/**
 * Read-only tools for AI agents (MCP server at /mcp). They only return what
 * the public website already shows; nothing needs a sign-in and nothing is
 * changed.
 */
export type AgentTool = {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  run: (args: Record<string, unknown>, origin: string) => Promise<unknown> | unknown;
};

const SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/;

export const AGENT_TOOLS: AgentTool[] = [
  {
    name: "get_overview",
    title: `About ${BRAND.name}`,
    description: `What ${BRAND.name} is, its main features, who it is for, how it works and links to the main pages.`,
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    run: (_args, origin) => productOverview(origin),
  },
  {
    name: "get_pricing",
    title: "Plans and prices",
    description: `${BRAND.name} plans with monthly and yearly prices, what each includes and the free trial.`,
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    run: (_args, origin) => pricingOverview(origin),
  },
  {
    name: "get_business_booking_page",
    title: "A business's booking page",
    description: `Public details of a business that takes bookings on ${BRAND.name}: name, city, services with prices and durations, opening hours and its booking link. Needs the business's booking-page slug (the part after /book/ in its link).`,
    inputSchema: {
      type: "object",
      properties: {
        slug: { type: "string", description: "Booking-page slug, e.g. \"maria-beauty-studio\"", pattern: SLUG.source },
      },
      required: ["slug"],
      additionalProperties: false,
    },
    run: async (args, origin) => {
      const slug = String(args.slug ?? "").trim().toLowerCase();
      if (!SLUG.test(slug)) throw new Error("Give a valid booking-page slug (letters, numbers and dashes).");
      const sb = getAnonClient();
      const { data: business } = await sb.rpc("public_business_by_slug", { p_slug: slug }).maybeSingle();
      if (!business) return { found: false, message: "No business with online booking uses this link." };
      const b = business as any;
      const [{ data: services }, { data: hours }] = await Promise.all([
        sb.rpc("public_services_for_business", { p_business_id: b.id }),
        sb.rpc("public_hours_for_business", { p_business_id: b.id }),
      ]);
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      return {
        found: true,
        name: b.name,
        description: b.description ?? null,
        city: b.city ?? null,
        country: b.country ?? null,
        currency: b.currency ?? null,
        bookingUrl: `${origin}/book/${b.slug}`,
        services: ((services as any[]) ?? []).map((s) => ({
          name: s.name,
          description: s.description ?? null,
          durationMinutes: s.duration_minutes,
          price: s.price != null ? Number(s.price) : null,
          currency: s.currency ?? b.currency ?? null,
        })),
        openingHours: ((hours as any[]) ?? []).map((h) => ({
          day: days[h.day_of_week] ?? h.day_of_week,
          closed: !!h.is_closed,
          from: h.is_closed ? null : String(h.start_time ?? "").slice(0, 5),
          to: h.is_closed ? null : String(h.end_time ?? "").slice(0, 5),
        })),
        note: "To book, open bookingUrl and pick a service and a free time.",
      };
    },
  },
];

/** Tool list without the code, for MCP tools/list and the server card. */
export const agentToolList = () =>
  AGENT_TOOLS.map(({ name, title, description, inputSchema }) => ({
    name,
    title,
    description,
    inputSchema,
    annotations: { readOnlyHint: true, openWorldHint: false },
  }));
