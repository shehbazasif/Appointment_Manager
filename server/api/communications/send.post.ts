import { readValidatedBody, setResponseStatus } from "h3";
import { z } from "zod";
import { requireTenant } from "../../utils/auth";
import { getUserClient } from "../../utils/supabase";

const sendCommunicationSchema = z.object({
  customerId: z.string().uuid().optional(),
  appointmentId: z.string().uuid().optional(),
  channel: z.enum(["EMAIL", "SMS", "WHATSAPP"]),
  recipient: z.string().min(3),
  subject: z.string().optional(),
  message: z.string().min(1).max(2000),
});

export default defineEventHandler(async (event) => {
  const { businessId } = await requireTenant(event);
  const input = await readValidatedBody(event, sendCommunicationSchema.parse);
  const sb = await getUserClient(event);

  // If customerId is passed, verify it belongs to this business
  if (input.customerId) {
    const { data: customer } = await sb
      .from("customers")
      .select("id")
      .eq("id", input.customerId)
      .eq("business_id", businessId)
      .single();

    if (!customer)
      throw createError({ statusCode: 404, statusMessage: "Customer not found." });
  }

  const now = new Date().toISOString();
  const row: Record<string, unknown> = {
    business_id: businessId,
    customer_id: input.customerId ?? null,
    appointment_id: input.appointmentId ?? null,
    channel: input.channel,
    type: input.subject ? `MANUAL_MESSAGE: ${input.subject}` : "MANUAL_MESSAGE",
    scheduled_for: now,
    status: "SENT",
    sent_at: now,
  };
  // notifications table stores the recipient by channel
  if (input.channel === "EMAIL") row.recipient_email = input.recipient;
  else row.recipient_phone = input.recipient;

  const { data: job, error } = await sb
    .from("notifications")
    .insert(row)
    .select("id")
    .single();

  if (error) throw createError({ statusCode: 500, statusMessage: error.message });

  setResponseStatus(event, 201);
  return {
    success: true,
    message: `${input.channel} communication sent successfully to ${input.recipient}.`,
    jobId: job.id,
  };
});
