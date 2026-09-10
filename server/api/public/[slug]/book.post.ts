import { and, eq, gt, lt, ne } from "drizzle-orm";
import { readValidatedBody, setResponseStatus } from "h3";
import { publicBookingSchema } from "#shared/schemas/appointments";
import {
  appointments,
  appointmentStatusHistory,
  customers,
  organizations,
  services,
} from "../../../db/schema";
import { calculateAvailability } from "../../../services/availability";
import { requireDatabase } from "../../../utils/database";
import { queueAppointmentNotifications } from "../../../services/notifications";

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, "slug");
  const input = await readValidatedBody(event, publicBookingSchema.parse);
  if (!slug)
    throw createError({
      statusCode: 400,
      statusMessage: "Business slug is required.",
    });
  const database = requireDatabase();
  const business = await database.query.organizations.findFirst({
    where: eq(organizations.slug, slug),
  });
  if (!business || !business.bookingActive)
    throw createError({
      statusCode: 404,
      statusMessage: "Booking page not found.",
    });
  const service = await database.query.services.findFirst({
    where: and(
      eq(services.id, input.serviceId),
      eq(services.organizationId, business.id),
      eq(services.active, true),
    ),
  });
  if (!service)
    throw createError({ statusCode: 404, statusMessage: "Service not found." });
  const availability = await calculateAvailability(
    database,
    business.id,
    input.startAt,
    input.serviceId,
    input.staffId,
  );
  const selected = availability.find(
    (slot) => new Date(slot.startAt).getTime() === input.startAt.getTime(),
  );
  if (!selected)
    throw createError({
      statusCode: 409,
      statusMessage: "That time is no longer available.",
    });
  const endAt = new Date(
    input.startAt.getTime() + service.durationMinutes * 60000,
  );
  const result = await database.transaction(async (transaction) => {
    const existingCustomer = await transaction.query.customers.findFirst({
      where: and(
        eq(customers.organizationId, business.id),
        eq(customers.email, input.email.toLowerCase()),
      ),
    });
    const customer =
      existingCustomer ??
      (
        await transaction
          .insert(customers)
          .values({
            organizationId: business.id,
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email.toLowerCase(),
            phone: input.phone,
          })
          .returning()
      )[0];
    const overlap = await transaction.query.appointments.findFirst({
      where: and(
        eq(appointments.organizationId, business.id),
        eq(appointments.staffId, selected.staffId),
        ne(appointments.status, "CANCELLED"),
        ne(appointments.status, "NO_SHOW"),
        lt(appointments.startAt, endAt),
        gt(appointments.endAt, input.startAt),
      ),
    });
    if (overlap)
      throw createError({
        statusCode: 409,
        statusMessage: "That time is no longer available.",
      });
    const [appointment] = await transaction
      .insert(appointments)
      .values({
        organizationId: business.id,
        customerId: customer.id,
        staffId: selected.staffId,
        serviceId: service.id,
        startAt: input.startAt,
        endAt,
        status: "CONFIRMED",
        source: "ONLINE",
      })
      .returning();
    await transaction
      .insert(appointmentStatusHistory)
      .values({ appointmentId: appointment.id, toStatus: "CONFIRMED" });
    if (customer.email)
      await queueAppointmentNotifications(transaction, {
        organizationId: business.id,
        appointmentId: appointment.id,
        customerId: customer.id,
        recipient: customer.email,
        startAt: appointment.startAt,
      });
    return { appointment, customer };
  });
  setResponseStatus(event, 201);
  return result;
});
