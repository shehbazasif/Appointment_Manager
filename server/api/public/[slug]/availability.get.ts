import { getQuery } from "h3";
import { getAnonClient } from "../../../utils/supabase";
import { safeTimeZone, zonedToUtc } from "../../../utils/tz";

const toMinutes = (value: string) => {
  const [hours, minutes] = String(value).split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
};

const formatTimeLabel = (minutes: number) => {
  const h = Math.floor(minutes / 60).toString().padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
};

const INACTIVE = new Set(["CANCELLED", "NO_SHOW"]);

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

  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  if (!dateMatch) {
    throw createError({ statusCode: 400, statusMessage: "Invalid date format." });
  }
  const [y, m, d] = [Number(dateMatch[1]), Number(dateMatch[2]), Number(dateMatch[3])];

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

  // Everything below is calculated in the BUSINESS's time zone, so "09:00" means
  // 09:00 at the business no matter where the server or the customer is.
  const tzRes = await sb.rpc("public_business_timezone", { p_business_id: business.id });
  const tz = safeTimeZone(!tzRes.error && tzRes.data ? String(tzRes.data) : (business as any).timezone);

  const { data: services } = await sb
    .rpc("public_services_for_business", { p_business_id: business.id });
  const service = (services ?? []).find((s: any) => s.id === serviceId);
  if (!service)
    throw createError({ statusCode: 404, statusMessage: "Service not found or inactive." });

  const { data: hours } = await sb
    .rpc("public_hours_for_business", { p_business_id: business.id });

  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const dayHours = (hours ?? []).find((h: any) => h.day_of_week === weekday);
  if (dayHours?.is_closed) return [];

  const startMinutes = dayHours ? toMinutes(dayHours.start_time) : 9 * 60;
  const endMinutes = dayHours ? toMinutes(dayHours.end_time) : 19 * 60;

  const dayStart = zonedToUtc(y, m, d, 0, tz);
  const dayEnd = zonedToUtc(y, m, d + 1, 0, tz);

  // Staff-aware data (needs scripts/staff-features.sql). If it has not been run
  // yet, fall back to the old behaviour so the booking page keeps working.
  const [staffRes, schedRes, apptRes] = await Promise.all([
    sb.rpc("public_staff_for_business", { p_business_id: business.id }),
    sb.rpc("public_staff_schedules", { p_business_id: business.id }),
    sb.rpc("public_day_appointments_v2", {
      p_business_id: business.id,
      p_day_start: dayStart.toISOString(),
      p_day_end: dayEnd.toISOString(),
    }),
  ]);
  const staffMode = !staffRes.error && !schedRes.error && !apptRes.error;

  let dayAppointments: any[] = [];
  if (staffMode) {
    dayAppointments = apptRes.data ?? [];
  } else {
    const legacy = await sb.rpc("public_day_appointments", {
      p_business_id: business.id,
      p_day_start: dayStart.toISOString(),
      p_day_end: dayEnd.toISOString(),
    });
    if (legacy.error)
      throw createError({ statusCode: 500, statusMessage: legacy.error.message });
    dayAppointments = legacy.data ?? [];
  }

  const activeStaff: { id: string; service_ids: string[] }[] = staffMode ? (staffRes.data ?? []) : [];
  const schedules: any[] = staffMode ? (schedRes.data ?? []) : [];

  // Staff who may do this service: if the service is linked to specific staff, only
  // them; otherwise every active staff member.
  const serviceHasSpecificStaff = activeStaff.some((s) => (s.service_ids ?? []).includes(serviceId));
  const pool = activeStaff.filter(
    (s) => !serviceHasSpecificStaff || (s.service_ids ?? []).includes(serviceId),
  );

  const isOnDuty = (staffId: string, from: number, to: number) => {
    const rows = schedules.filter((r) => r.staff_id === staffId);
    if (rows.length === 0) return true; // no schedule set: follows business hours
    const row = rows.find((r) => r.day_of_week === weekday);
    return !!row && !row.is_off && toMinutes(row.start_time) <= from && toMinutes(row.end_time) >= to;
  };

  const slots: { time: string; startAt: string }[] = [];
  const now = new Date();
  const stepMinutes = 30;
  const durationMinutes = service.duration_minutes ?? 30;

  for (
    let minute = startMinutes;
    minute + durationMinutes <= endMinutes;
    minute += stepMinutes
  ) {
    const startAt = zonedToUtc(y, m, d, minute, tz);
    const endAt = new Date(startAt.getTime() + durationMinutes * 60000);

    if (startAt.getTime() <= now.getTime()) continue;

    const overlapping = dayAppointments.filter(
      (appt: any) =>
        !INACTIVE.has(appt.status) &&
        new Date(appt.start_at) < endAt &&
        new Date(appt.end_at) > startAt,
    );

    let available: boolean;
    if (staffMode && activeStaff.length > 0) {
      // Open while at least one on-duty staff member is free. Bookings with no
      // staff assigned (older ones) use up one place each.
      const busyStaff = new Set(overlapping.filter((a) => a.staff_id).map((a) => a.staff_id));
      const unassigned = overlapping.filter((a) => !a.staff_id).length;
      const freeStaff = pool.filter(
        (s) => isOnDuty(s.id, minute, minute + durationMinutes) && !busyStaff.has(s.id),
      );
      available = freeStaff.length - unassigned > 0;
    } else {
      // No staff set up: the business is one bookable place.
      available = overlapping.length < 1;
    }

    if (available) {
      slots.push({ time: formatTimeLabel(minute), startAt: startAt.toISOString() });
    }
  }

  return slots;
});
