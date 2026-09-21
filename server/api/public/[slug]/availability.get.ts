import { getQuery } from "h3";
import { calculatePublicAvailability } from "../../../services/availability";
import { getSupabaseAdmin } from "../../../utils/supabase";

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, "slug");
  const query = getQuery(event);
  const dateStr = String(query.date ?? "");
  const serviceId = String(query.serviceId ?? "");

  if (!slug || !dateStr || !serviceId) {
    throw createError({
      statusCode: 400,
      statusMessage: "date and serviceId are required.",
    });
  }

  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid date format.",
    });
  }

  const sb = getSupabaseAdmin();
  const { data: business } = await sb
    .from("organizations")
    .select("id, booking_active")
    .eq("slug", slug)
    .single();

  if (!business || !business.booking_active) {
    throw createError({
      statusCode: 404,
      statusMessage: "Booking page not found or inactive.",
    });
  }

  return calculatePublicAvailability(sb, business.id, date, serviceId);
});
