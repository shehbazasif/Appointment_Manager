import { requireTenant } from "../../../utils/auth";
import { getSupabaseAdmin } from "../../../utils/supabase";

export default defineEventHandler(async (event) => {
  const { organizationId } = await requireTenant(event);
  const staffId = getRouterParam(event, "id");
  if (!staffId) throw createError({ statusCode: 400, statusMessage: "Staff ID is required." });

  const sb = getSupabaseAdmin();

  const { data, error } = await sb
    .from("appointments")
    .select("*, customer:customers(*), service:services(*)")
    .eq("organization_id", organizationId)
    .eq("staff_id", staffId)
    .order("start_at", { ascending: true });

  if (error) throw createError({ statusCode: 500, statusMessage: error.message });

  return (data ?? []).map((row: any) => ({
    appointment: {
      id: row.id,
      organizationId: row.organization_id,
      customerId: row.customer_id,
      staffId: row.staff_id,
      serviceId: row.service_id,
      startAt: row.start_at,
      endAt: row.end_at,
      status: row.status,
      source: row.source,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
    customer: row.customer,
    service: row.service,
  }));
});
