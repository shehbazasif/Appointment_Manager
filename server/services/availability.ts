import { and, eq, gt, lt } from "drizzle-orm";
import {
  appointments,
  blockedTimes,
  businessHours,
  services,
  staff,
  staffServices,
} from "../db/schema";
import type { Database } from "../db";

const toMinutes = (value: string) => {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
};
const dateAtMinutes = (date: Date, minutes: number) => {
  const result = new Date(date);
  result.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return result;
};

export const calculateAvailability = async (
  database: Database,
  organizationId: string,
  date: Date,
  serviceId: string,
  requestedStaffId?: string,
) => {
  const service = await database.query.services.findFirst({
    where: and(
      eq(services.id, serviceId),
      eq(services.organizationId, organizationId),
      eq(services.active, true),
    ),
  });
  if (!service)
    throw createError({
      statusCode: 404,
      statusMessage: "Service not found or inactive.",
    });
  const weekday = date.getDay();
  const hours = await database.query.businessHours.findFirst({
    where: and(
      eq(businessHours.organizationId, organizationId),
      eq(businessHours.dayOfWeek, weekday),
      eq(businessHours.enabled, true),
    ),
  });
  const startMinutes = hours ? toMinutes(hours.startTime) : 9 * 60;
  const endMinutes = hours ? toMinutes(hours.endTime) : 19 * 60;
  const staffRows = await database
    .select({ id: staff.id })
    .from(staff)
    .innerJoin(staffServices, eq(staffServices.staffId, staff.id))
    .where(
      and(
        eq(staff.organizationId, organizationId),
        eq(staffServices.serviceId, serviceId),
        eq(staff.active, true),
        requestedStaffId ? eq(staff.id, requestedStaffId) : undefined,
      ),
    );
  const dayStart = dateAtMinutes(date, 0);
  const dayEnd = dateAtMinutes(date, 24 * 60 - 1);
  const existing = await database.query.appointments.findMany({
    where: and(
      eq(appointments.organizationId, organizationId),
      gt(appointments.endAt, dayStart),
      lt(appointments.startAt, dayEnd),
    ),
  });
  const blocked = await database.query.blockedTimes.findMany({
    where: and(
      eq(blockedTimes.organizationId, organizationId),
      gt(blockedTimes.endAt, dayStart),
      lt(blockedTimes.startAt, dayEnd),
    ),
  });
  const slots: Array<{ startAt: string; staffId: string }> = [];
  for (const member of staffRows)
    for (
      let minute = startMinutes;
      minute + service.durationMinutes <= endMinutes;
      minute += 15
    ) {
      const startAt = dateAtMinutes(date, minute);
      const endAt = new Date(
        startAt.getTime() + service.durationMinutes * 60000,
      );
      const occupied = existing.some(
        (appointment) =>
          appointment.staffId === member.id &&
          appointment.status !== "CANCELLED" &&
          appointment.status !== "NO_SHOW" &&
          appointment.startAt < endAt &&
          appointment.endAt > startAt,
      );
      const isBlocked = blocked.some(
        (period) =>
          (!period.staffId || period.staffId === member.id) &&
          period.startAt < endAt &&
          period.endAt > startAt,
      );
      if (!occupied && !isBlocked)
        slots.push({ startAt: startAt.toISOString(), staffId: member.id });
    }
  return slots;
};
