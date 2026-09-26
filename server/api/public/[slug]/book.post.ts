import { readValidatedBody, setResponseStatus } from "h3";
import { publicBookingSchema } from "#shared/schemas/appointments";
import { getAnonClient } from "../../../utils/supabase";

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, "slug");
  const input = await readValidatedBody(event, publicBookingSchema.parse);
  if (!slug)
    throw createError({
      statusCode: 400,
      statusMessage: "Business slug is required.",
    });

  const sb = getAnonClient();

  const endAt = new Date(input.startAt.getTime() + 60 * 60000); // refined below

  // Service duration is needed for the end time — read via the public RPC
  const { data: business } = await sb
    .rpc("public_business_by_slug", { p_slug: slug })
    .maybeSingle();
  if (!business)
    throw createError({
      statusCode: 404,
      statusMessage: "Booking page not found or inactive.",
    });

  const { data: services } = await sb.rpc("public_services_for_business", {
    p_business_id: business.id,
  });
  const service = (services ?? []).find((s: any) => s.id === input.serviceId);
  if (!service)
    throw createError({ statusCode: 404, statusMessage: "Service not found or inactive." });

  const realEndAt = new Date(
    input.startAt.getTime() + (service.duration_minutes ?? 30) * 60000,
  );
  void endAt;

  // Everything (business check, service check, customer find-or-create,
  // overlap check, inserts) happens inside the SECURITY DEFINER function
  const { data: appointmentId, error } = await sb.rpc("public_book_appointment", {
    p_business_slug: slug,
    p_service_id: input.serviceId,
    p_start_at: input.startAt.toISOString(),
    p_end_at: realEndAt.toISOString(),
    p_first_name: input.firstName,
    p_last_name: input.lastName,
    p_email: input.email,
    p_phone: input.phone,
    p_notes: input.notes ?? null,
  });

  if (error) {
    const message = error.message ?? "Booking failed.";
    const conflict = /no longer available|not found or inactive/i.test(message);
    throw createError({
      statusCode: conflict ? 409 : 400,
      statusMessage: message,
    });
  }

  setResponseStatus(event, 201);
  return {
    appointment: { id: appointmentId, status: "CONFIRMED", source: "ONLINE" },
    service: {
      id: service.id,
      name: service.name,
      durationMinutes: service.duration_minutes,
      priceCents: Math.round(Number(service.price) * 100),
    },
    business: {
      name: business.name,
      city: business.city,
      country: business.country,
      phone: business.phone,
    },
  };
});
