import { readValidatedBody, setResponseStatus } from "h3";
import { appointmentSchema } from "#shared/schemas/appointments";
import { requireTenant } from "../../utils/auth";
import { getSupabaseAdmin } from "../../utils/supabase";

export default defineEventHandler(async (event) => {
  const { organizationId, userId } = await requireTenant(event);
  const input = await readValidatedBody(event, appointmentSchema.parse);
  const sb = getSupabaseAdmin();

  // Validate service
  const { data: service } = await sb
    .from("services")
    .select("*")
    .eq("id", input.serviceId)
    .eq("organization_id", organizationId)
    .eq("active", true)
    .single();

  if (!service)
    throw createError({ statusCode: 404, statusMessage: "Service not found or inactive." });

  const startAt = input.startAt instanceof Date ? input.startAt : new Date(input.startAt);
  const endAt = new Date(startAt.getTime() + service.duration_minutes * 60000);

  // Validate staff assignment if provided
  if (input.staffId) {
    const { data: staffMember } = await sb
      .from("staff")
      .select("id")
      .eq("id", input.staffId)
      .eq("organization_id", organizationId)
      .eq("active", true)
      .single();

    if (!staffMember)
      throw createError({
        statusCode: 400,
        statusMessage: "Assigned staff member is not active or not in this organization.",
      });

    // Check overlap
    const { data: overlap } = await sb
      .from("appointments")
      .select("id")
      .eq("organization_id", organizationId)
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
      organization_id: organizationId,
      customer_id: input.customerId,
      staff_id: input.staffId ?? null,
      service_id: input.serviceId,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      status: "CONFIRMED",
      source: input.source ?? "MANUAL",
      notes: input.notes ?? null,
    })
    .select()
    .single();

  if (apptError) throw createError({ statusCode: 500, statusMessage: apptError.message });

  // Insert status history
  await sb.from("appointment_status_history").insert({
    appointment_id: appointment.id,
    to_status: appointment.status,
    changed_by_user_id: userId,
  });

  // Queue notification
  const { data: customer } = await sb
    .from("customers")
    .select("id, email")
    .eq("id", input.customerId)
    .single();

  if (customer?.email) {
    const reminderAt = new Date(startAt.getTime() - 24 * 60 * 60 * 1000);
    await sb.from("notification_jobs").insert([
      {
        organization_id: organizationId,
        appointment_id: appointment.id,
        customer_id: customer.id,
        channel: "email",
        type: "APPOINTMENT_CONFIRMATION",
        recipient: customer.email,
        scheduled_at: new Date().toISOString(),
      },
      {
        organization_id: organizationId,
        appointment_id: appointment.id,
        customer_id: customer.id,
        channel: "email",
        type: "APPOINTMENT_REMINDER",
        recipient: customer.email,
        scheduled_at: reminderAt.toISOString(),
      },
    ]);
  }

  setResponseStatus(event, 201);
  return appointment;
});
