import { readValidatedBody } from "h3";
import { businessHoursBatchSchema } from "#shared/schemas/business";
import { requireTenant } from "../../utils/auth";
import { getUserClient } from "../../utils/supabase";

/**
 * Save the weekly hours (one row per day).
 * The table has no unique (business_id, day_of_week) key, so instead of an
 * ON CONFLICT upsert we update the existing row of each day by its id and
 * insert rows only for days that do not exist yet.
 */
export default defineEventHandler(async (event) => {
  const { businessId } = await requireTenant(event);
  const { hours } = await readValidatedBody(event, businessHoursBatchSchema.parse);
  const sb = await getUserClient(event);

  const { data: existing, error: readError } = await sb
    .from("business_hours")
    .select("id, day_of_week")
    .eq("business_id", businessId);
  if (readError) throw createError({ statusCode: 500, statusMessage: readError.message });

  const idByDay = new Map<number, string>();
  for (const row of existing ?? []) {
    if (!idByDay.has(row.day_of_week)) idByDay.set(row.day_of_week, row.id);
  }

  const toRow = (item: (typeof hours)[number]) => ({
    business_id: businessId,
    day_of_week: item.dayOfWeek,
    start_time: item.startTime,
    end_time: item.endTime,
    is_closed: !item.enabled,
    updated_at: new Date().toISOString(),
  });

  const updates = hours.filter((h) => idByDay.has(h.dayOfWeek)).map((h) => ({ id: idByDay.get(h.dayOfWeek)!, ...toRow(h) }));
  const inserts = hours.filter((h) => !idByDay.has(h.dayOfWeek)).map(toRow);

  if (updates.length) {
    const { error } = await sb.from("business_hours").upsert(updates, { onConflict: "id" });
    if (error) throw createError({ statusCode: 500, statusMessage: error.message });
  }
  if (inserts.length) {
    const { error } = await sb.from("business_hours").insert(inserts);
    if (error) throw createError({ statusCode: 500, statusMessage: error.message });
  }

  const { data: saved, error: finalError } = await sb
    .from("business_hours")
    .select("day_of_week, start_time, end_time, is_closed")
    .eq("business_id", businessId)
    .order("day_of_week");
  if (finalError) throw createError({ statusCode: 500, statusMessage: finalError.message });

  return (saved ?? []).map((h: any) => ({
    dayOfWeek: h.day_of_week,
    startTime: (h.start_time ?? "").slice(0, 5),
    endTime: (h.end_time ?? "").slice(0, 5),
    enabled: !h.is_closed,
  }));
});
