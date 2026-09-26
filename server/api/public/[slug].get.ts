import { getAnonClient } from "../../utils/supabase";

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, "slug");
  if (!slug)
    throw createError({ statusCode: 400, statusMessage: "Business slug is required." });

  const sb = getAnonClient();

  // Narrow SECURITY DEFINER RPC — anon cannot read the tables directly
  const { data: business, error } = await sb
    .rpc("public_business_by_slug", { p_slug: slug })
    .maybeSingle();

  if (error)
    throw createError({ statusCode: 500, statusMessage: error.message });

  if (!business)
    throw createError({
      statusCode: 404,
      statusMessage: "This booking page is currently unavailable or inactive.",
    });

  const [{ data: activeServices }, { data: hours }] = await Promise.all([
    sb.rpc("public_services_for_business", { p_business_id: business.id }),
    sb.rpc("public_hours_for_business", { p_business_id: business.id }),
  ]);

  return {
    business: {
      name: business.name,
      slug: business.slug,
      description: business.description,
      city: business.city,
      country: business.country,
      phone: business.phone,
      email: business.email,
      timezone: business.timezone,
      currency: business.currency,
      logoUrl: (business as any).logo_url ?? null,
      bookingActive: true,
    },
    services: (activeServices ?? []).map((s: any) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      category: "General",
      durationMinutes: s.duration_minutes,
      priceCents: s.price != null ? Math.round(Number(s.price) * 100) : 0,
      accent: "#ca7481",
    })),
    hours: (hours ?? []).map((h: any) => ({
      dayOfWeek: h.day_of_week,
      startTime: String(h.start_time ?? "").slice(0, 5),
      endTime: String(h.end_time ?? "").slice(0, 5),
      enabled: !h.is_closed,
    })),
  };
});
