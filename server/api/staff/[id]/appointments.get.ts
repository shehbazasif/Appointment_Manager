import { requireTenant } from "../../../utils/auth";
import { getUserClient } from "../../../utils/supabase";

export default defineEventHandler(async (event) => {
  const { businessId } = await requireTenant(event);
  const staffId = getRouterParam(event, "id");
  if (!staffId) throw createError({ statusCode: 400, statusMessage: "Staff ID is required." });

  const sb = await getUserClient(event);

  const { data, error } = await sb
    .from("appointments")
    .select("*, customer:customers(*), service:services(*)")
    .eq("business_id", businessId)
    .eq("staff_id", staffId)
    .order("start_at", { ascending: true });

  if (error) throw createError({ statusCode: 500, statusMessage: error.message });

  return (data ?? []).map((row: any) => ({
    appointment: {
      id: row.id,
      organizationId: row.business_id,
      customerId: row.customer_id,
      staffId: row.staff_id,
      serviceId: row.service_id,
      startAt: row.start_at,
      endAt: row.end_at,
      status: row.status,
      source: row.booking_source,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
    customer: row.customer,
    service: row.service,
  }));
});
