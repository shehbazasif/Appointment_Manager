import { readValidatedBody, setResponseStatus } from "h3";
import { appointmentSchema } from "#shared/schemas/appointments";
import { requireTenant } from "../../utils/auth";
import { getUserClient } from "../../utils/supabase";
import { queueAppointmentNotifications } from "../../services/notifications";

export default defineEventHandler(async (event) => {
  const { businessId, userId, business } = await requireTenant(event);
  const input = await readValidatedBody(event, appointmentSchema.parse);
  const sb = await getUserClient(event);

  // Validate service
  const { data: service } = await sb
    .from("services")
    .select("*")
    .eq("id", input.serviceId)
    .eq("business_id", businessId)
    .single();

  if (!service)
    throw createError({ statusCode: 404, statusMessage: "Service not found or inactive." });

  const startAt =
    input.startAt instanceof Date ? input.startAt : new Date(input.startAt);
  const endAt = new Date(startAt.getTime() + service.duration_minutes * 60000);

  // Validate staff assignment if provided
  if (input.staffId) {
    const { data: staffMember } = await sb
      .from("staff")
      .select("id")
      .eq("id", input.staffId)
      .eq("business_id", businessId)
      .eq("status", "ACTIVE")
      .single();

    if (!staffMember)
      throw createError({
        statusCode: 400,
        statusMessage:
          "Assigned staff member is not active or not in this business.",
      });

    // Check overlap
    const { data: overlap } = await sb
      .from("appointments")
      .select("id")
      .eq("business_id", businessId)
      .eq("staff_id", input.staffId)
      .not("status", "in", '("CANCELLED","NO_SHOW")')
      .lt("start_at", endAt.toISOString())
      .gt("end_at", startAt.toISOString())
      .maybeSingle();

    if (overlap)
      throw createError({
        statusCode: 409,
        statusMessage: "That staff member is already booked for this time.",
      });
  }

  // Insert appointment
  const { data: appointment, error: apptError } = await sb
    .from("appointments")
    .insert({
      business_id: businessId,
      customer_id: input.customerId,
      staff_id: input.staffId ?? null,
      service_id: input.serviceId,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      status: "CONFIRMED",
      booking_source: input.source ?? "MANUAL",
      notes: input.notes ?? null,
      created_by: userId,
    })
    .select()
    .single();

  if (apptError) throw createError({ statusCode: 500, statusMessage: apptError.message });

  // Insert status history (appointment_history: action/new_status/changed_by)
  await sb.from("appointment_history").insert({
    business_id: businessId,
    appointment_id: appointment.id,
    action: "CREATED",
    new_status: appointment.status,
    changed_by: userId,
  });

  // Queue notification jobs (sends the real confirmation email via SMTP)
  const { data: customer } = await sb
    .from("customers")
    .select("id, email, first_name, last_name")
    .eq("id", input.customerId)
    .single();

  if (customer?.email) {
    await queueAppointmentNotifications(sb, {
      businessId,
      appointmentId: appointment.id,
      customerId: customer.id,
      recipient: customer.email,
      startAt,
      businessName: (business as any)?.name ?? undefined,
      serviceName: service.name,
      customerName: [customer.first_name, customer.last_name].filter(Boolean).join(" ") || undefined,
    });
  }

  setResponseStatus(event, 201);
  return {
    id: appointment.id,
    organizationId: appointment.business_id,
    customerId: appointment.customer_id,
    staffId: appointment.staff_id,
    serviceId: appointment.service_id,
    startAt: appointment.start_at,
    endAt: appointment.end_at,
    status: appointment.status,
    source: appointment.booking_source,
    notes: appointment.notes,
  };
});
