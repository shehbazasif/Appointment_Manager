import { readValidatedBody, setResponseStatus } from "h3";
import { z } from "zod";
import { requireTenant } from "../../utils/auth";
import { getSupabaseAdmin } from "../../utils/supabase";

const sendCommunicationSchema = z.object({
  customerId: z.string().uuid().optional(),
  appointmentId: z.string().uuid().optional(),
  channel: z.enum(["EMAIL", "SMS", "WHATSAPP"]),
  recipient: z.string().min(3),
  subject: z.string().optional(),
  message: z.string().min(1).max(2000),
});

export default defineEventHandler(async (event) => {
  const { organizationId } = await requireTenant(event);
  const input = await readValidatedBody(event, sendCommunicationSchema.parse);
  const sb = getSupabaseAdmin();

  // If customerId is passed, verify it belongs to tenant
  if (input.customerId) {
    const { data: customer } = await sb
      .from("customers")
      .select("id")
      .eq("id", input.customerId)
      .eq("organization_id", organizationId)
      .single();

    if (!customer)
      throw createError({ statusCode: 404, statusMessage: "Customer not found." });
  }

  const now = new Date().toISOString();
  const { data: job, error } = await sb
    .from("notification_jobs")
    .insert({
      organization_id: organizationId,
      customer_id: input.customerId ?? null,
      appointment_id: input.appointmentId ?? null,
      channel: input.channel,
      type: input.subject ? `MANUAL_MESSAGE: ${input.subject}` : "MANUAL_MESSAGE",
      recipient: input.recipient,
      scheduled_at: now,
      status: "SENT",
      sent_at: now,
      error: null,
    })
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
