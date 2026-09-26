import { requireTenant } from "../../utils/auth";
import { getUserClient } from "../../utils/supabase";

const DEFAULT_HOURS = [
  { dayOfWeek: 0, startTime: "10:00", endTime: "16:00", enabled: false }, // Sunday
  { dayOfWeek: 1, startTime: "09:00", endTime: "19:00", enabled: true },  // Monday
  { dayOfWeek: 2, startTime: "09:00", endTime: "19:00", enabled: true },  // Tuesday
  { dayOfWeek: 3, startTime: "09:00", endTime: "19:00", enabled: true },  // Wednesday
  { dayOfWeek: 4, startTime: "09:00", endTime: "19:00", enabled: true },  // Thursday
  { dayOfWeek: 5, startTime: "09:00", endTime: "19:00", enabled: true },  // Friday
  { dayOfWeek: 6, startTime: "09:00", endTime: "17:00", enabled: true },  // Saturday
];

export default defineEventHandler(async (event) => {
  const { businessId } = await requireTenant(event);
  const sb = await getUserClient(event);

  const { data: hours, error } = await sb
    .from("business_hours")
    .select("*")
    .eq("business_id", businessId)
    .order("day_of_week", { ascending: true });

  if (error) throw createError({ statusCode: 500, statusMessage: error.message });

  if (!hours || hours.length === 0) return DEFAULT_HOURS;

  // Serialize snake_case rows into the camelCase shape the UI expects
  return hours.map((h: any) => ({
    dayOfWeek: h.day_of_week,
    startTime: (h.start_time ?? "").slice(0, 5),
    endTime: (h.end_time ?? "").slice(0, 5),
    enabled: !h.is_closed,
  }));
});
