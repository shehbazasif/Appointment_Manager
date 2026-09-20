import { and, eq } from "drizzle-orm";
import { readValidatedBody } from "h3";
import { appointmentStatusSchema } from "#shared/schemas/appointments";
import { appointments, appointmentStatusHistory } from "../../db/schema";
import { requireDatabase } from "../../utils/database";
import { requireTenant } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  const { organizationId, userId } = await requireTenant(event);
  const id = getRouterParam(event, "id");
  const { status } = await readValidatedBody(
    event,
    appointmentStatusSchema.parse,
  );
  if (!id)
    throw createError({
      statusCode: 400,
      statusMessage: "Appointment id is required.",
    });
  const database = requireDatabase();
  const current = await database.query.appointments.findFirst({
    where: and(
      eq(appointments.id, id),
      eq(appointments.organizationId, organizationId),
    ),
  });
  if (!current)
    throw createError({
      statusCode: 404,
      statusMessage: "Appointment not found.",
    });
  if (current.status === status) return current;
  const result = await database.transaction(async (transaction) => {
    const [appointment] = await transaction
      .update(appointments)
      .set({ status, updatedAt: new Date() })
      .where(eq(appointments.id, id))
      .returning();
    await transaction
      .insert(appointmentStatusHistory)
      .values({
        appointmentId: id,
        fromStatus: current.status,
        toStatus: status,
        changedByUserId: userId,
      });
    return appointment;
  });
  return result;
});