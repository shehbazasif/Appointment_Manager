import { requireTenant } from "../../utils/auth";
import { getSupabaseAdmin } from "../../utils/supabase";

export default defineEventHandler(async (event) => {
  const { organizationId } = await requireTenant(event);
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "Customer ID is required." });

  const sb = getSupabaseAdmin();

  const { data: customer, error: custError } = await sb
    .from("customers")
    .select("*")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .single();

  if (custError || !customer)
    throw createError({ statusCode: 404, statusMessage: "Customer not found." });

  // Get customer appointment history with joins
  const { data: customerAppointments } = await sb
    .from("appointments")
    .select("*, service:services(*), staff:staff(*)")
    .eq("customer_id", id)
    .eq("organization_id", organizationId)
    .order("start_at", { ascending: false });

  const appointments = (customerAppointments ?? []).map((row: any) => ({
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
    service: row.service,
    staff: row.staff,
  }));

  return {
    customer,
    appointments,
    totalAppointments: appointments.length,
    completedAppointments: appointments.filter((a) => a.appointment.status === "COMPLETED").length,
  };
});
