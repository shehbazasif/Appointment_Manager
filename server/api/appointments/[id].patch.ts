import { readValidatedBody } from "h3";
import { updateAppointmentSchema } from "#shared/schemas/appointments";
import { requireTenant } from "../../utils/auth";
import { getUserClient } from "../../utils/supabase";

export default defineEventHandler(async (event) => {
  const { businessId, userId } = await requireTenant(event);
  const id = getRouterParam(event, "id");
  if (!id)
    throw createError({ statusCode: 400, statusMessage: "Appointment id is required." });

  const input = await readValidatedBody(event, updateAppointmentSchema.parse);
  const sb = await getUserClient(event);

  // Fetch current appointment
  const { data: current } = await sb
    .from("appointments")
    .select("*")
    .eq("id", id)
    .eq("business_id", businessId)
    .single();

  if (!current)
    throw createError({ statusCode: 404, statusMessage: "Appointment not found." });

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

  let statusChanged = false;
  if (input.status && input.status !== current.status) {
    updateData.status = input.status;
    statusChanged = true;
  }

  // Determine service for duration
  const serviceId = input.serviceId ?? current.service_id;
  let durationMinutes = 30;
  if (serviceId) {
    const { data: service } = await sb
      .from("services")
      .select("duration_minutes")
      .eq("id", serviceId)
      .eq("business_id", businessId)
      .single();
    if (service) durationMinutes = service.duration_minutes;
  }

  const startAt = input.startAt ? new Date(input.startAt) : new Date(current.start_at);
  const endAt = new Date(startAt.getTime() + durationMinutes * 60000);

  if (input.serviceId !== undefined) updateData.service_id = input.serviceId;
  if (input.startAt !== undefined) {
    updateData.start_at = startAt.toISOString();
    updateData.end_at = endAt.toISOString();
  }

  // Staff assignment
  let targetStaffId = current.staff_id;
  if (input.staffId !== undefined) {
    updateData.staff_id = input.staffId;
    targetStaffId = input.staffId;
  }

  // Check for staff conflicts
  const effectiveStatus = input.status ?? current.status;
  if (targetStaffId && effectiveStatus !== "CANCELLED" && effectiveStatus !== "NO_SHOW") {
    const { data: staffMember } = await sb
      .from("staff")
      .select("id")
      .eq("id", targetStaffId)
      .eq("business_id", businessId)
      .eq("status", "ACTIVE")
      .single();

    if (!staffMember)
      throw createError({
        statusCode: 400,
        statusMessage:
          "Assigned staff member is not active or not in this business.",
      });

    const { data: overlap } = await sb
      .from("appointments")
      .select("id")
      .eq("business_id", businessId)
      .eq("staff_id", targetStaffId)
      .neq("id", id)
      .not("status", "in", '("CANCELLED","NO_SHOW")')
      .lt("start_at", endAt.toISOString())
      .gt("end_at", startAt.toISOString())
      .maybeSingle();

    if (overlap)
      throw createError({
        statusCode: 409,
        statusMessage:
          "That staff member has a conflicting appointment at this time.",
      });
  }

  if (input.notes !== undefined) updateData.notes = input.notes;

  const { data: updated, error } = await sb
    .from("appointments")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) throw createError({ statusCode: 500, statusMessage: error.message });

  if (statusChanged && input.status) {
    await sb.from("appointment_history").insert({
      business_id: businessId,
      appointment_id: id,
      action: `STATUS_${input.status}`,
      previous_status: current.status,
      new_status: input.status,
      changed_by: userId,
    });
  }

  return {
    id: updated.id,
    organizationId: updated.business_id,
    customerId: updated.customer_id,
    staffId: updated.staff_id,
    serviceId: updated.service_id,
    startAt: updated.start_at,
    endAt: updated.end_at,
    status: updated.status,
    source: updated.booking_source,
    notes: updated.notes,
  };
});
