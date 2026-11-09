import { requireTenant } from "../../utils/auth";
import { getUserClient } from "../../utils/supabase";

export const serializeAppointmentRow = (row: any) => ({
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
  staff: row.staff,
});

export default defineEventHandler(async (event) => {
  const { businessId } = await requireTenant(event);
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "Customer ID is required." });

  const sb = await getUserClient(event);

  const { data: customer, error: custError } = await sb
    .from("customers")
    .select("*")
    .eq("id", id)
    .eq("business_id", businessId)
    .single();

  if (custError || !customer)
    throw createError({ statusCode: 404, statusMessage: "Customer not found." });

  // Get customer appointment history with joins
  const { data: customerAppointments } = await sb
    .from("appointments")
    .select("*, service:services(*), staff:staff(*)")
    .eq("customer_id", id)
    .eq("business_id", businessId)
    .order("start_at", { ascending: false });

  const appointments = (customerAppointments ?? []).map((row: any) => ({
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
    service: row.service
      ? {
          id: row.service.id,
          name: row.service.name,
          durationMinutes: row.service.duration_minutes,
          priceCents: row.service.price != null ? Math.round(Number(row.service.price) * 100) : 0,
          currency: row.service.currency ?? null,
          accent: row.service.accent ?? "#ca7481",
        }
      : null,
    staff: row.staff
      ? {
          id: row.staff.id,
          name: [row.staff.first_name, row.staff.last_name].filter(Boolean).join(" "),
          role: row.staff.job_title ?? "",
        }
      : null,
  }));

  return {
    customer: {
      id: customer.id,
      businessId: customer.business_id,
      firstName: customer.first_name,
      lastName: customer.last_name,
      email: customer.email ?? null,
      phone: customer.phone,
      notes: customer.notes ?? null,
      createdAt: customer.created_at,
    },
    appointments,
    totalAppointments: appointments.length,
    completedAppointments: appointments.filter((a) => a.appointment.status === "COMPLETED").length,
  };
});
