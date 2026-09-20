import { and, eq, lt, gt, ne } from "drizzle-orm";
import { readValidatedBody, setResponseStatus } from "h3";
import { appointmentSchema } from "#shared/schemas/appointments";
import {
  appointments,
  appointmentStatusHistory,
  customers,
  services,
} from "../../db/schema";
import { requireDatabase } from "../../utils/database";
import { requireTenant } from "../../utils/auth";
import { queueAppointmentNotifications } from "../../services/notifications";

export default defineEventHandler(async (event) => {
  const { organizationId, userId } = await requireTenant(event);
  const input = await readValidatedBody(event, appointmentSchema.parse);
  const database = requireDatabase();
  const service = await database.query.services.findFirst({
    where: and(
      eq(services.id, input.serviceId),
      eq(services.organizationId, organizationId),
      eq(services.active, true),
    ),
  });
  if (!service)
    throw createError({ statusCode: 404, statusMessage: "Service not found." });
  const endAt = new Date(
    input.startAt.getTime() + service.durationMinutes * 60000,
  );
  const overlap = await database.query.appointments.findFirst({
    where: and(
      eq(appointments.organizationId, organizationId),
      eq(appointments.staffId, input.staffId),
      ne(appointments.status, "CANCELLED"),
      ne(appointments.status, "NO_SHOW"),
      lt(appointments.startAt, endAt),
      gt(appointments.endAt, input.startAt),
    ),
  });
  if (overlap)
    throw createError({
      statusCode: 409,
      statusMessage: "That staff member is already booked for this time.",
    });
  const result = await database.transaction(async (transaction) => {
    const [appointment] = await transaction
      .insert(appointments)
      .values({ ...input, organizationId, endAt })
      .returning();
    await transaction
      .insert(appointmentStatusHistory)
      .values({
        appointmentId: appointment.id,
        toStatus: appointment.status,
        changedByUserId: userId,
      });
    const customer = await transaction.query.customers.findFirst({
      where: eq(customers.id, input.customerId),
    });
    if (customer?.email)
      await queueAppointmentNotifications(transaction, {
        organizationId,
        appointmentId: appointment.id,
        customerId: customer.id,
        recipient: customer.email,
        startAt: appointment.startAt,
      });
    return appointment;
  });
  setResponseStatus(event, 201);
  return result;
});
