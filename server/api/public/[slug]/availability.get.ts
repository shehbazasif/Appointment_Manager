import { getQuery } from "h3";
import { getAnonClient } from "../../../utils/supabase";

const toMinutes = (value: string) => {
  const [hours, minutes] = String(value).split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
};

const dateAtMinutes = (date: Date, minutes: number) => {
  const result = new Date(date);
  result.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return result;
};

const formatTimeLabel = (minutes: number) => {
  const h = Math.floor(minutes / 60).toString().padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
};

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
    throw createError({ statusCode: 400, statusMessage: "Invalid date format." });
  }

  const sb = getAnonClient();

  const { data: business, error: bizError } = await sb
    .rpc("public_business_by_slug", { p_slug: slug })
    .maybeSingle();
  if (bizError)
    throw createError({ statusCode: 500, statusMessage: bizError.message });
  if (!business)
    throw createError({
      statusCode: 404,
      statusMessage: "Booking page not found or inactive.",
    });

  const { data: services } = await sb
    .rpc("public_services_for_business", { p_business_id: business.id });
  const service = (services ?? []).find((s: any) => s.id === serviceId);
  if (!service)
    throw createError({ statusCode: 404, statusMessage: "Service not found or inactive." });

  const { data: hours } = await sb
    .rpc("public_hours_for_business", { p_business_id: business.id });

  const weekday = date.getDay();
  const dayHours = (hours ?? []).find((h: any) => h.day_of_week === weekday);
  if (dayHours?.is_closed) return [];

  let startMinutes = dayHours ? toMinutes(dayHours.start_time) : 9 * 60;
  let endMinutes = dayHours ? toMinutes(dayHours.end_time) : 19 * 60;

  // Staff count defines concurrency capacity (active staff of this business)
  // — exposed through the day-appointments RPC capacity fallback of 1 when
  // the caller has no access; booking capacity for public slots uses the
  // number of overlapping unassigned bookings instead.
  const dayStart = dateAtMinutes(date, 0);
  const dayEnd = dateAtMinutes(date, 24 * 60 - 1);

  const { data: dayAppointments, error: apptError } = await sb.rpc(
    "public_day_appointments",
    {
      p_business_id: business.id,
      p_day_start: dayStart.toISOString(),
      p_day_end: dayEnd.toISOString(),
    },
  );
  if (apptError)
    throw createError({ statusCode: 500, statusMessage: apptError.message });

  const slots: { time: string; startAt: string }[] = [];
  const now = new Date();
  const stepMinutes = 30;
  const durationMinutes = service.duration_minutes ?? 30;
  // Concurrency capacity: distinct non-cancelled overlapping bookings cap.
  // Without staff info, treat capacity as 1 to avoid double-booking.
  const capacity = 1;

  for (
    let minute = startMinutes;
    minute + durationMinutes <= endMinutes;
    minute += stepMinutes
  ) {
    const startAt = dateAtMinutes(date, minute);
    const endAt = new Date(startAt.getTime() + durationMinutes * 60000);

    if (startAt.getTime() <= now.getTime()) continue;

    const overlapping = (dayAppointments ?? []).filter(
      (appt: any) =>
        appt.status !== "CANCELLED" &&
        appt.status !== "NO_SHOW" &&
        new Date(appt.start_at) < endAt &&
        new Date(appt.end_at) > startAt,
    );

    if (overlapping.length < capacity) {
      slots.push({ time: formatTimeLabel(minute), startAt: startAt.toISOString() });
    }
  }

  return slots;
});
