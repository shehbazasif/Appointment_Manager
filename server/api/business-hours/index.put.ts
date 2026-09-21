import { readValidatedBody } from "h3";
import { businessHoursBatchSchema } from "#shared/schemas/business";
import { requireTenant } from "../../utils/auth";
import { getSupabaseAdmin } from "../../utils/supabase";

export default defineEventHandler(async (event) => {
  const { organizationId } = await requireTenant(event);
  const { hours } = await readValidatedBody(event, businessHoursBatchSchema.parse);
  const sb = getSupabaseAdmin();

  // Delete all existing hours for this org then re-insert
  await sb.from("business_hours").delete().eq("organization_id", organizationId);

  const { data: inserted, error } = await sb
    .from("business_hours")
    .insert(
      hours.map((item) => ({
        organization_id: organizationId,
        day_of_week: item.dayOfWeek,
        start_time: item.startTime,
        end_time: item.endTime,
        enabled: item.enabled,
      }))
    )
    .select();

  if (error) throw createError({ statusCode: 500, statusMessage: error.message });
  return inserted ?? [];
});
