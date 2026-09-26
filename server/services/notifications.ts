import nodemailer from "nodemailer";
import type { SupabaseClient as SBClient } from "@supabase/supabase-js";

type SupabaseLike = Pick<SBClient, "from">;

const SMTP_HOST = process.env.SMTP_HOST ?? "";
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 465);
const SMTP_USER = process.env.SMTP_USER ?? "";
const SMTP_PASS = process.env.SMTP_PASS ?? "";
const SMTP_FROM =
  process.env.SMTP_FROM ?? (SMTP_USER ? `RantevouOS <${SMTP_USER}>` : "");

export const isEmailConfigured = () => Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465, // Hostinger: 465 = SSL, 587 = STARTTLS
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return transporter;
};

/** Sends an email via the configured SMTP provider. Never throws. */
export const sendEmail = async (opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ ok: boolean; messageId?: string; error?: string }> => {
  if (!isEmailConfigured()) {
    console.warn("[email] SMTP not configured — skipping real send.");
    return { ok: false, error: "SMTP_NOT_CONFIGURED" };
  }
  try {
    const info = await getTransporter().sendMail({
      from: SMTP_FROM || SMTP_USER,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    });
    return { ok: true, messageId: info.messageId };
  } catch (err: any) {
    console.error("[email] send failed:", err?.message);
    return { ok: false, error: err?.message ?? "SMTP send failed" };
  }
};

export const buildConfirmationEmail = (opts: {
  businessName: string;
  serviceName: string;
  startAt: Date;
  customerName: string;
}) => {
  const when = opts.startAt.toLocaleString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return {
    subject: `Appointment confirmed — ${opts.businessName}`,
    text: `Hello ${opts.customerName},\n\nYour appointment at ${opts.businessName} is confirmed.\n\nService: ${opts.serviceName}\nWhen: ${when}\n\nSee you soon!`,
    html: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#24262d">
      <h2 style="margin:0 0 4px;color:#24262d">Appointment confirmed ✅</h2>
      <p style="margin:0 0 20px;color:#6b7280;font-size:14px">Hello ${opts.customerName}, your booking at <strong>${opts.businessName}</strong> is confirmed.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:8px 0;color:#6b7280">Service</td><td style="padding:8px 0;text-align:right;font-weight:bold">${opts.serviceName}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280">When</td><td style="padding:8px 0;text-align:right;font-weight:bold">${when}</td></tr>
      </table>
      <p style="margin:24px 0 0;color:#9ca3af;font-size:12px">Powered by RantevouOS</p>
    </div>`,
  };
};

/**
 * Sends the appointment confirmation email immediately via SMTP and records
 * an honest SENT/FAILED status in `notifications`. Also queues a reminder
 * row (status PENDING) for a future cron job when the reminder time is in
 * the future. Never throws — a notification failure must never fail a booking.
 */
export const queueAppointmentNotifications = async (
  sb: SupabaseLike,
  input: {
    businessId: string;
    appointmentId: string;
    customerId: string | null;
    recipient: string;
    startAt: Date;
    businessName?: string;
    serviceName?: string;
    customerName?: string;
  },
) => {
  const reminderAt = new Date(input.startAt.getTime() - 24 * 60 * 60 * 1000);

  // 1. Confirmation — send now via SMTP
  const mail = buildConfirmationEmail({
    businessName: input.businessName ?? "our studio",
    serviceName: input.serviceName ?? "Your appointment",
    startAt: input.startAt,
    customerName: input.customerName ?? "there",
  });

  const confirmationRow = {
    business_id: input.businessId,
    appointment_id: input.appointmentId,
    customer_id: input.customerId,
    channel: "EMAIL",
    type: "APPOINTMENT_CONFIRMATION",
    recipient_email: input.recipient,
    scheduled_for: new Date().toISOString(),
    status: "PENDING",
  };
  const { data: inserted } = await sb
    .from("notifications")
    .insert(confirmationRow)
    .select("id")
    .single();

  if (inserted) {
    if (isEmailConfigured()) {
      const result = await sendEmail({
        to: input.recipient,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      });
      await sb
        .from("notifications")
        .update(
          result.ok
            ? { status: "SENT", sent_at: new Date().toISOString(), provider_message_id: result.messageId ?? null }
            : { status: "FAILED", error_message: result.error ?? "Send failed" },
        )
        .eq("id", inserted.id);
    } else {
      await sb
        .from("notifications")
        .update({ status: "FAILED", error_message: "SMTP_NOT_CONFIGURED" })
        .eq("id", inserted.id);
    }
  }

  // 2. Reminder — queue for a future cron job (skip if already in the past)
  if (reminderAt.getTime() > Date.now()) {
    const { error } = await sb.from("notifications").insert({
      business_id: input.businessId,
      appointment_id: input.appointmentId,
      customer_id: input.customerId,
      channel: "EMAIL",
      type: "APPOINTMENT_REMINDER",
      recipient_email: input.recipient,
      scheduled_for: reminderAt.toISOString(),
      status: "PENDING",
    });
    if (error) console.warn("Failed to queue reminder:", error.message);
  }
};
