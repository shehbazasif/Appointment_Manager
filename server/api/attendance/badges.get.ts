import { requireTenant } from "../../utils/auth";
import { getUserClient } from "../../utils/supabase";
import { staffBadgeToken } from "../../utils/attendance";

export default defineEventHandler(async (event) => {
  const { businessId } = await requireTenant(event);
  const sb = await getUserClient(event);
  const { data, error } = await sb
    .from("staff")
    .select("id, first_name, last_name, job_title")
    .eq("business_id", businessId)
    .eq("status", "ACTIVE")
    .order("first_name");
  if (error) throw createError({ statusCode: 500, statusMessage: error.message });
  return (data ?? []).map((s: any) => ({
    id: s.id,
    name: [s.first_name, s.last_name].filter(Boolean).join(" "),
    role: s.job_title ?? "Staff",
    token: staffBadgeToken(businessId, s.id),
  }));
});
