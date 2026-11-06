import { getQuery } from "h3";
import { requireTenant } from "../../utils/auth";
import { getUserClient } from "../../utils/supabase";
import { safeTimeZone, todayInZone, zonedToUtc } from "../../utils/tz";

export default defineEventHandler(async (event) => {
  const { businessId } = await requireTenant(event);
  const sb = await getUserClient(event);

  const { data: settings } = await sb.from("business_settings").select("timezone").eq("business_id", businessId).maybeSingle();
  const timezone = safeTimeZone((settings as any)?.timezone ?? "Europe/Athens");

  const q = String(getQuery(event).date ?? "") || todayInZone(timezone);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(q);
  if (!match) throw createError({ statusCode: 400, statusMessage: "date must be YYYY-MM-DD." });
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];

  const { data, error } = await sb
    .from("staff_attendance")
    .select("id, staff_id, check_in_at, check_out_at, method, staff:staff_id(first_name, last_name, job_title)")
    .eq("business_id", businessId)
    .gte("check_in_at", zonedToUtc(y, m, d, 0, timezone).toISOString())
    .lt("check_in_at", zonedToUtc(y, m, d + 1, 0, timezone).toISOString())
    .order("check_in_at", { ascending: false });
  if (error) throw createError({ statusCode: 500, statusMessage: error.message });

  return {
    date: q,
    timezone,
    records: (data ?? []).map((r: any) => ({
      id: r.id,
      staffId: r.staff_id,
      staffName: [r.staff?.first_name, r.staff?.last_name].filter(Boolean).join(" "),
      role: r.staff?.job_title ?? "Staff",
      checkInAt: r.check_in_at,
      checkOutAt: r.check_out_at,
      method: r.method,
    })),
  };
});
