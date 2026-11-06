import { requireTenant } from "../../utils/auth";
import { getUserClient } from "../../utils/supabase";

export default defineEventHandler(async (event) => {
  const { businessId } = await requireTenant(event);
  const sb = await getUserClient(event);
  const { data, error } = await sb
    .from("staff_schedules")
    .select("staff_id, day_of_week, is_off, start_time, end_time")
    .eq("business_id", businessId);
  if (error) throw createError({ statusCode: 500, statusMessage: error.message });
  return (data ?? []).map((r: any) => ({
    staffId: r.staff_id,
    dayOfWeek: r.day_of_week,
    isOff: r.is_off,
    startTime: String(r.start_time).slice(0, 5),
    endTime: String(r.end_time).slice(0, 5),
  }));
});
