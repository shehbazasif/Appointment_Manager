import { readValidatedBody } from "h3";
import { businessHoursBatchSchema } from "#shared/schemas/business";
import { requireTenant } from "../../utils/auth";
import { getUserClient } from "../../utils/supabase";

export default defineEventHandler(async (event) => {
  const { businessId } = await requireTenant(event);
  const { hours } = await readValidatedBody(event, businessHoursBatchSchema.parse);
  const sb = await getUserClient(event);

  // Replace-all: upsert each day (business_id + day_of_week is the natural key)
  const { data: inserted, error } = await sb
    .from("business_hours")
    .upsert(
      hours.map((item) => ({
        business_id: businessId,
        day_of_week: item.dayOfWeek,
        start_time: item.startTime,
        end_time: item.endTime,
        is_closed: !item.enabled,
      })),
      { onConflict: "business_id,day_of_week" },
    )
    .select();

  if (error) throw createError({ statusCode: 500, statusMessage: error.message });
  return (inserted ?? []).map((h: any) => ({
    dayOfWeek: h.day_of_week,
    startTime: (h.start_time ?? "").slice(0, 5),
    endTime: (h.end_time ?? "").slice(0, 5),
    enabled: !h.is_closed,
  }));
});
