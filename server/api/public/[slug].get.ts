import { getSupabaseAdmin } from "../../utils/supabase";

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, "slug");
  if (!slug)
    throw createError({ statusCode: 400, statusMessage: "Business slug is required." });

  const sb = getSupabaseAdmin();
  const { data: business } = await sb
    .from("organizations")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!business || !business.booking_active)
    throw createError({
      statusCode: 404,
      statusMessage: "This booking page is currently unavailable or inactive.",
    });

  const { data: activeServices } = await sb
    .from("services")
    .select("*")
    .eq("organization_id", business.id)
    .eq("active", true);

  const { data: hours } = await sb
    .from("business_hours")
    .select("*")
    .eq("organization_id", business.id)
    .order("day_of_week", { ascending: true });

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
      bookingActive: business.booking_active,
    },
    services: (activeServices ?? []).map((s: any) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      category: s.category,
      durationMinutes: s.duration_minutes,
      priceCents: s.price_cents,
      accent: s.accent,
    })),
    hours: hours ?? [],
  };
});
