import { requireTenant } from "../../utils/auth";
import { getSupabaseAdmin } from "../../utils/supabase";

export default defineEventHandler(async (event) => {
  const { organizationId } = await requireTenant(event);
  const sb = getSupabaseAdmin();

  const { data: hours, error } = await sb
    .from("business_hours")
    .select("*")
    .eq("organization_id", organizationId)
    .order("day_of_week", { ascending: true });

  if (error) throw createError({ statusCode: 500, statusMessage: error.message });

  // Return defaults if no rows exist
  if (!hours || hours.length === 0) {
    return [
      { dayOfWeek: 0, startTime: "10:00", endTime: "16:00", enabled: false }, // Sunday
      { dayOfWeek: 1, startTime: "09:00", endTime: "19:00", enabled: true },  // Monday
      { dayOfWeek: 2, startTime: "09:00", endTime: "19:00", enabled: true },  // Tuesday
      { dayOfWeek: 3, startTime: "09:00", endTime: "19:00", enabled: true },  // Wednesday
      { dayOfWeek: 4, startTime: "09:00", endTime: "19:00", enabled: true },  // Thursday
      { dayOfWeek: 5, startTime: "09:00", endTime: "19:00", enabled: true },  // Friday
      { dayOfWeek: 6, startTime: "09:00", endTime: "17:00", enabled: true },  // Saturday
    ];
  }

  return hours;
});
