import { notificationJobs } from "../db/schema";
import type { DbClient } from "../db";

export const queueAppointmentNotifications = async (
  database: DbClient,
  input: {
    organizationId: string;
    appointmentId: string;
    customerId: string;
    recipient: string;
    startAt: Date;
  },
) => {
  const reminderAt = new Date(input.startAt.getTime() - 24 * 60 * 60 * 1000);
  return database
    .insert(notificationJobs)
    .values([
      {
        organizationId: input.organizationId,
        appointmentId: input.appointmentId,
        customerId: input.customerId,
        channel: "email",
        type: "APPOINTMENT_CONFIRMATION",
        recipient: input.recipient,
        scheduledAt: new Date(),
      },
      {
        organizationId: input.organizationId,
        appointmentId: input.appointmentId,
        customerId: input.customerId,
        channel: "email",
        type: "APPOINTMENT_REMINDER",
        recipient: input.recipient,
        scheduledAt: reminderAt,
      },
    ])
    .returning();
};

export const simulateSms = async (
  database: DbClient,
  input: {
    organizationId: string;
    customerId: string;
    recipient: string;
    message: string;
  },
) => {
  const [job] = await database
    .insert(notificationJobs)
    .values({
      organizationId: input.organizationId,
      customerId: input.customerId,
      channel: "sms",
      type: "SIMULATED_SMS",
      recipient: input.recipient,
      scheduledAt: new Date(),
      status: "SIMULATED",
    })
    .returning();
  return { job, preview: input.message };
};
