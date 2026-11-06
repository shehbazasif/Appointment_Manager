import { readBody } from "h3";
import { requireTenant } from "../../utils/auth";
import { getUserClient } from "../../utils/supabase";
import { staffIdFromToken } from "../../utils/attendance";

const DEBOUNCE_MS = 60_000; // ignore a second scan within a minute
const STALE_OPEN_MS = 16 * 3600_000; // an unclosed check-in older than this is treated as forgotten

export default defineEventHandler(async (event) => {
  const { businessId } = await requireTenant(event);
  const body = await readBody(event);
  const staffId = staffIdFromToken(businessId, body?.token);
  if (!staffId) throw createError({ statusCode: 400, statusMessage: "This QR code is not valid for this business." });

  const sb = await getUserClient(event);
  const { data: staff } = await sb
    .from("staff")
    .select("id, first_name, last_name, status")
    .eq("id", staffId)
    .eq("business_id", businessId)
    .maybeSingle();
  if (!staff || staff.status !== "ACTIVE")
    throw createError({ statusCode: 404, statusMessage: "Staff member not found or not active." });
  const name = [staff.first_name, staff.last_name].filter(Boolean).join(" ");

  const { data: open } = await sb
    .from("staff_attendance")
    .select("id, check_in_at")
    .eq("staff_id", staffId)
    .is("check_out_at", null)
    .order("check_in_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const now = new Date();
  if (open && now.getTime() - new Date(open.check_in_at).getTime() < STALE_OPEN_MS) {
    if (now.getTime() - new Date(open.check_in_at).getTime() < DEBOUNCE_MS)
      return { action: "IGNORED", staffName: name, at: open.check_in_at };
    const { error } = await sb.from("staff_attendance").update({ check_out_at: now.toISOString() }).eq("id", open.id);
    if (error) throw createError({ statusCode: 500, statusMessage: error.message });
    return { action: "CHECK_OUT", staffName: name, at: now.toISOString() };
  }

  const { error } = await sb
    .from("staff_attendance")
    .insert({ business_id: businessId, staff_id: staffId, check_in_at: now.toISOString(), method: "QR" });
  if (error) throw createError({ statusCode: 500, statusMessage: error.message });
  return { action: "CHECK_IN", staffName: name, at: now.toISOString() };
});
