import { requireTenant } from "../../utils/auth";
import { getUserClient } from "../../utils/supabase";
import { mapAppointmentRow } from "../../utils/appointments";

/** One appointment with customer / service / staff (used by the token print page). */
export default defineEventHandler(async (event) => {
  const { businessId } = await requireTenant(event);
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "Missing appointment id." });
  const sb = await getUserClient(event);
  const { data, error } = await sb
    .from("appointments")
    .select("*, customer:customers(*), service:services(*), staff:staff(*)")
    .eq("id", id)
    .eq("business_id", businessId)
    .maybeSingle();
  if (error) throw createError({ statusCode: 500, statusMessage: error.message });
  if (!data) throw createError({ statusCode: 404, statusMessage: "Appointment not found." });
  return mapAppointmentRow(data);
});
