import { readBody } from "h3";
import { z } from "zod";
import { requireTenant } from "../../../utils/auth";
import { getUserClient } from "../../../utils/supabase";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be HH:MM");
const bodySchema = z.object({
  // empty list = remove the schedule (staff follows the business hours again)
  days: z
    .array(
      z.object({
        dayOfWeek: z.number().int().min(0).max(6),
        isOff: z.boolean(),
        startTime: time,
        endTime: time,
      }),
    )
    .max(7),
});

export default defineEventHandler(async (event) => {
  const { businessId } = await requireTenant(event);
  const staffId = getRouterParam(event, "id");
  const parsed = bodySchema.safeParse(await readBody(event));
  if (!staffId || !parsed.success)
    throw createError({ statusCode: 400, statusMessage: parsed.success ? "Staff id required." : (parsed.error.issues[0]?.message ?? "Invalid schedule.") });

  for (const day of parsed.data.days) {
    if (!day.isOff && day.endTime <= day.startTime)
      throw createError({ statusCode: 400, statusMessage: "End time must be after start time." });
  }

  const sb = await getUserClient(event);
  const { data: staff } = await sb.from("staff").select("id").eq("id", staffId).eq("business_id", businessId).maybeSingle();
  if (!staff) throw createError({ statusCode: 404, statusMessage: "Staff member not found." });

  const { error: delError } = await sb.from("staff_schedules").delete().eq("staff_id", staffId).eq("business_id", businessId);
  if (delError) throw createError({ statusCode: 500, statusMessage: delError.message });

  if (parsed.data.days.length) {
    const { error } = await sb.from("staff_schedules").insert(
      parsed.data.days.map((d) => ({
        business_id: businessId,
        staff_id: staffId,
        day_of_week: d.dayOfWeek,
        is_off: d.isOff,
        start_time: d.startTime,
        end_time: d.endTime,
      })),
    );
    if (error) throw createError({ statusCode: 500, statusMessage: error.message });
  }
  return { ok: true };
});
