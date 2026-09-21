import { and, eq } from "drizzle-orm";
import { readValidatedBody, setResponseStatus } from "h3";
import { publicBookingSchema } from "#shared/schemas/appointments";
import {
  appointments,
  appointmentStatusHistory,
  customers,
  organizations,
  services,
} from "../../../db/schema";
import { calculatePublicAvailability } from "../../../services/availability";
import { requireDatabase } from "../../../utils/database";
import { getSupabaseAdmin } from "../../../utils/supabase";
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
      statusMessage: "Booking page not found or inactive.",
    });

  const service = await database.query.services.findFirst({
    where: and(
      eq(services.id, input.serviceId),
      eq(services.organizationId, business.id),
      eq(services.active, true),
    ),
  });

  if (!service)
    throw createError({ statusCode: 404, statusMessage: "Service not found or inactive." });

  // Re-verify availability
  const sb = getSupabaseAdmin();
  const availability = await calculatePublicAvailability(
    sb,
    business.id,
    input.startAt,
    input.serviceId,
  );

  const selected = availability.find(
    (slot) => new Date(slot.startAt).getTime() === input.startAt.getTime(),
  );

  if (!selected)
    throw createError({
      statusCode: 409,
      statusMessage: "That time slot is no longer available. Please choose another time.",
    });

  const endAt = new Date(
    input.startAt.getTime() + service.durationMinutes * 60000,
  );

  const result = await database.transaction(async (transaction) => {
    // Find or create customer
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
            notes: input.notes ?? null,
          })
          .returning()
      )[0];

    if (!customer) {
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to create or retrieve customer record.",
      });
    }

    // Save appointment with staff_id = NULL
    const [appointment] = await transaction
      .insert(appointments)
      .values({
        organizationId: business.id,
        customerId: customer.id,
        staffId: null, // Customer-created bookings default to staff_id = NULL
        serviceId: service.id,
        startAt: input.startAt,
        endAt,
        status: "CONFIRMED",
        source: "ONLINE",
        notes: input.notes ?? null,
      })
      .returning();

    if (!appointment) {
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to create appointment record.",
      });
    }

    await transaction
      .insert(appointmentStatusHistory)
      .values({ appointmentId: appointment.id, toStatus: "CONFIRMED" });

    if (customer.email) {
      await queueAppointmentNotifications(transaction, {
        organizationId: business.id,
        appointmentId: appointment.id,
        customerId: customer.id,
        recipient: customer.email,
        startAt: appointment.startAt,
      });
    }

    return {
      appointment,
      customer,
      service: {
        id: service.id,
        name: service.name,
        durationMinutes: service.durationMinutes,
        priceCents: service.priceCents,
      },
      business: {
        name: business.name,
        city: business.city,
        country: business.country,
        phone: business.phone,
      },
    };
  });

  setResponseStatus(event, 201);
  return result;
});
