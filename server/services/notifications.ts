import type { SupabaseClient } from "@supabase/supabase-js";

type SupabaseLike = Pick<SupabaseClient, "from">;

export const queueAppointmentNotifications = async (
  sb: SupabaseLike,
  input: {
    businessId: string;
    appointmentId: string;
    customerId: string | null;
    recipient: string;
    startAt: Date;
  },
) => {
  const reminderAt = new Date(input.startAt.getTime() - 24 * 60 * 60 * 1000);
  const rows = [
    {
      business_id: input.businessId,
      appointment_id: input.appointmentId,
      customer_id: input.customerId,
      channel: "EMAIL",
      type: "APPOINTMENT_CONFIRMATION",
      recipient_email: input.recipient,
      scheduled_for: new Date().toISOString(),
      status: "QUEUED",
    },
    {
      business_id: input.businessId,
      appointment_id: input.appointmentId,
      customer_id: input.customerId,
      channel: "EMAIL",
      type: "APPOINTMENT_REMINDER",
      recipient_email: input.recipient,
      scheduled_for: reminderAt.toISOString(),
      status: "QUEUED",
    },
  ];
  const { error } = await sb.from("notifications").insert(rows);
  if (error) console.warn("Failed to queue notifications:", error.message);
  return rows;
};
