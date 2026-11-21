import { readValidatedBody, setResponseStatus } from "h3";
import { appointmentSchema } from "#shared/schemas/appointments";
import { requireTenant } from "../../utils/auth";
import { getUserClient } from "../../utils/supabase";
import { queueAppointmentNotifications } from "../../services/notifications";
import { staffBusyError, staffOwners } from "../../utils/sharedStaff";

export default defineEventHandler(async (event) => {
  const { businessId, userId, business, settings } = await requireTenant(event);
  const input = await readValidatedBody(event, appointmentSchema.parse);
  const sb = await getUserClient(event);

  // Services: one, or several (each with how many pets) — all from this business
  const wanted = input.items?.length ? input.items : [{ serviceId: input.serviceId, qty: 1 }];
  const { data: found } = await sb
    .from("services")
    .select("*")
    .in("id", [...new Set(wanted.map((w) => w.serviceId))])
    .eq("business_id", businessId);
  const byId = new Map((found ?? []).map((s: any) => [s.id, s]));
  if (wanted.some((w) => !byId.has(w.serviceId)))
    throw createError({ statusCode: 404, statusMessage: "Service not found or inactive." });
  const service = byId.get(wanted[0]!.serviceId) as any;
  const items = wanted.map((w) => {
    const s = byId.get(w.serviceId) as any;
    return { serviceId: s.id, name: s.name, qty: w.qty, price: Number(s.price ?? 0), durationMinutes: s.duration_minutes ?? 0 };
  });
  const totalMinutes = Math.max(5, items.reduce((m, i) => m + i.durationMinutes * i.qty, 0));
  // the agreed price; when not typed, the services' prices added up
  const price = input.price ?? (input.items?.length ? items.reduce((m, i) => m + i.price * i.qty, 0) : null);

  const startAt =
    input.startAt instanceof Date ? input.startAt : new Date(input.startAt);
  const endAt = new Date(startAt.getTime() + totalMinutes * 60000);

  // Validate staff assignment if provided
  if (input.staffId) {
    const { data: staffMember } = await sb
      .from("staff")
      .select("id")
      .eq("id", input.staffId)
      // own staff, or the head office's (drivers are shared with branches)
      .in("business_id", staffOwners(businessId, business))
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (!staffMember)
      throw createError({
        statusCode: 400,
        statusMessage:
          "Assigned staff member is not active or not in this business.",
      });

    // Check overlap (anywhere this person works; the database checks again
    // across every branch, including ones this account cannot see)
    const { data: overlap } = await sb
      .from("appointments")
      .select("id")
      .eq("staff_id", input.staffId)
      .not("status", "in", '("CANCELLED","NO_SHOW","cancelled","no_show")')
      .lt("start_at", endAt.toISOString())
      .gt("end_at", startAt.toISOString())
      .limit(1);

    if (overlap?.length) throw staffBusyError();
  }

  // Insert appointment
  const { data: appointment, error: apptError } = await sb
    .from("appointments")
    .insert({
      business_id: businessId,
      customer_id: input.customerId,
      staff_id: input.staffId ?? null,
      service_id: service.id,
      pet_name: input.petName || null,
      items: input.items?.length ? items.map(({ durationMinutes, ...i }) => i) : null,
      price,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      status: "CONFIRMED",
      booking_source: input.source ?? "MANUAL",
      notes: input.notes ?? null,
      created_by: userId,
      ...(input.location
        ? {
            location_lat: input.location.lat ?? null,
            location_lng: input.location.lng ?? null,
            location_accuracy_m: input.location.accuracy ?? null,
            location_note: input.location.note || null,
            location_url: input.location.url || null,
            location_captured_at: new Date().toISOString(),
          }
        : {}),
      // on-location mode: a booking created with staff is "Assigned" right away
      ...((settings as any)?.on_location_enabled && input.staffId
        ? { field_status: "ASSIGNED" }
        : {}),
    })
    .select()
    .single();

  if (apptError && /STAFF_BUSY/.test(apptError.message ?? "")) throw staffBusyError();
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
      timezone: (business as any)?.timezone ?? undefined,
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
