import type { SupabaseClient } from "@supabase/supabase-js";

const toMinutes = (value: string) => {
  const [hours, minutes] = value.split(":").map(Number);
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

export interface PublicSlot {
  time: string;
  startAt: string;
}

export const calculatePublicAvailability = async (
  sb: SupabaseClient,
  businessId: string,
  date: Date,
  serviceId: string,
): Promise<PublicSlot[]> => {
  const { data: service } = await sb
    .from("services")
    .select("duration_minutes")
    .eq("id", serviceId)
    .eq("business_id", businessId)
    .single();

  if (!service) {
    throw createError({ statusCode: 404, statusMessage: "Service not found or inactive." });
  }

  const weekday = date.getDay();
  const { data: hours } = await sb
    .from("business_hours")
    .select("*")
    .eq("business_id", businessId)
    .eq("day_of_week", weekday)
    .single();

  // Closed day
  if (hours && hours.is_closed) return [];

  let startMinutes = hours ? toMinutes(hours.start_time) : 9 * 60;
  let endMinutes = hours ? toMinutes(hours.end_time) : 19 * 60;

  // Active staff count defines concurrency capacity
  const { count: activeStaffCount } = await sb
    .from("staff")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .eq("status", "ACTIVE");

  const capacity = Math.max(activeStaffCount ?? 1, 1);

  const dayStart = dateAtMinutes(date, 0);
  const dayEnd = dateAtMinutes(date, 24 * 60 - 1);

  const { data: existing } = await sb
    .from("appointments")
    .select("start_at, end_at, status")
    .eq("business_id", businessId)
    .gt("end_at", dayStart.toISOString())
    .lt("start_at", dayEnd.toISOString());

  // business_schedule_exceptions close (or extend) specific dates
  const { data: exceptions } = await sb
    .from("business_schedule_exceptions")
    .select("is_closed, start_time, end_time")
    .eq("business_id", businessId)
    .eq("date", date.toISOString().slice(0, 10));

  for (const exception of exceptions ?? []) {
    if (exception.is_closed) return [];
    if (exception.start_time) startMinutes = toMinutes(exception.start_time);
    if (exception.end_time) endMinutes = toMinutes(exception.end_time);
  }

  const slots: PublicSlot[] = [];
  const now = new Date();
  const stepMinutes = 30;

  for (
    let minute = startMinutesOverride;
    minute + (service.duration_minutes ?? 30) <= endMinutesOverride;
    minute += stepMinutes
  ) {
    const startAt = dateAtMinutes(date, minute);
    const endAt = new Date(startAt.getTime() + (service.duration_minutes ?? 30) * 60000);

    if (startAt.getTime() <= now.getTime()) continue;

    const overlappingAppointments = (existing ?? []).filter(
      (appt) =>
        appt.status !== "CANCELLED" &&
        appt.status !== "NO_SHOW" &&
        new Date(appt.start_at) < endAt &&
        new Date(appt.end_at) > startAt,
    );

    if (overlappingAppointments.length < capacity) {
      slots.push({ time: formatTimeLabel(minute), startAt: startAt.toISOString() });
    }
  }

  return slots;
};
