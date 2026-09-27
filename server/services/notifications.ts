import nodemailer from "nodemailer";
import type { SupabaseClient as SBClient } from "@supabase/supabase-js";

type SupabaseLike = Pick<SBClient, "from">;

// Accept both spellings — the .env file uses SMTP_PASSWORD while the code
// historically read SMTP_PASS (this mismatch is why no emails were ever sent).
const SMTP_HOST = process.env.SMTP_HOST ?? "";
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 465);
const SMTP_USER = process.env.SMTP_USER ?? process.env.SMTP_USERNAME ?? "";
const SMTP_PASS = process.env.SMTP_PASSWORD ?? process.env.SMTP_PASS ?? "";

// Unified sender identity for ALL booking emails (confirmations, owner alerts,
// reminders). Priority: SMTP_FROM > BOOKINGS_EMAIL > SMTP_USER.
const SMTP_FROM =
  process.env.SMTP_FROM ??
  (process.env.BOOKINGS_EMAIL
    ? `RantevouOS Bookings <${process.env.BOOKINGS_EMAIL}>`
    : SMTP_USER
      ? `RantevouOS Bookings <${SMTP_USER}>`
      : "");

export const senderAddress = () => SMTP_FROM || SMTP_USER;

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

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Formats "Monday, 28 September 2026 at 10:00" honoring the business timezone. */
export const formatAppointmentWhen = (startAt: Date, timezone?: string | null) => {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: timezone || undefined,
    }).format(startAt);
  } catch {
    return startAt.toISOString();
  }
};

const shell = (bodyHtml: string) => `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#24262d">
  ${bodyHtml}
  <p style="margin:24px 0 0;color:#9ca3af;font-size:12px">Powered by RantevouOS</p>
</div>`;

const detailTable = (rows: [string, string][]) =>
  `<table style="width:100%;border-collapse:collapse;font-size:14px">${rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 0;color:#6b7280">${escapeHtml(k)}</td><td style="padding:8px 0;text-align:right;font-weight:bold">${escapeHtml(v)}</td></tr>`,
    )
    .join("")}</table>`;

/** Confirmation email sent to the CUSTOMER right after a booking is made. */
export const buildConfirmationEmail = (opts: {
  businessName: string;
  serviceName: string;
  startAt: Date;
  customerName: string;
  timezone?: string | null;
}) => {
  const when = formatAppointmentWhen(opts.startAt, opts.timezone);
  return {
    subject: `Appointment confirmed — ${opts.businessName}`,
    text: `Hello ${opts.customerName},\n\nYour appointment at ${opts.businessName} is confirmed.\n\nService: ${opts.serviceName}\nWhen: ${when}\n\nSee you soon!`,
    html: shell(`<h2 style="margin:0 0 4px;color:#24262d">Appointment confirmed ✅</h2>
      <p style="margin:0 0 20px;color:#6b7280;font-size:14px">Hello ${escapeHtml(opts.customerName)}, your booking at <strong>${escapeHtml(opts.businessName)}</strong> is confirmed.</p>
      ${detailTable([
        ["Service", opts.serviceName],
        ["When", when],
      ])}`),
  };
};

/** "New booking" alert sent to the BUSINESS OWNER when a customer books online. */
export const buildOwnerAlertEmail = (opts: {
  businessName: string;
  serviceName: string;
  startAt: Date;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  timezone?: string | null;
}) => {
  const when = formatAppointmentWhen(opts.startAt, opts.timezone);
  const name = opts.customerName || "A customer";
  return {
    subject: `New booking — ${name}, ${when}`,
    text: `${name} just booked an appointment at ${opts.businessName}.\n\nCustomer: ${name}${opts.customerEmail ? `\nEmail: ${opts.customerEmail}` : ""}${opts.customerPhone ? `\nPhone: ${opts.customerPhone}` : ""}\nService: ${opts.serviceName}\nWhen: ${when}`,
    html: shell(`<h2 style="margin:0 0 4px;color:#24262d">New booking received 🎉</h2>
      <p style="margin:0 0 20px;color:#6b7280;font-size:14px"><strong>${escapeHtml(name)}</strong> just booked an appointment at <strong>${escapeHtml(opts.businessName)}</strong>.</p>
      ${detailTable([
        ["Customer", name],
        ...(opts.customerEmail ? ([["Email", opts.customerEmail]] as [string, string][]) : []),
        ...(opts.customerPhone ? ([["Phone", opts.customerPhone]] as [string, string][]) : []),
        ["Service", opts.serviceName],
        ["When", when],
      ])}`),
  };
};

/** Reminder email sent to the CUSTOMER before the appointment. */
export const buildReminderEmail = (opts: {
  businessName: string;
  serviceName: string;
  startAt: Date;
  customerName: string;
  timezone?: string | null;
}) => {
  const when = formatAppointmentWhen(opts.startAt, opts.timezone);
  const name = opts.customerName || "there";
  return {
    subject: `Reminder: your appointment at ${opts.businessName} is coming up`,
    text: `Hello ${name},\n\nThis is a friendly reminder about your upcoming appointment at ${opts.businessName}.\n\nService: ${opts.serviceName}\nWhen: ${when}\n\nWe look forward to seeing you!`,
    html: shell(`<h2 style="margin:0 0 4px;color:#24262d">Upcoming appointment ⏰</h2>
      <p style="margin:0 0 20px;color:#6b7280;font-size:14px">Hello ${escapeHtml(name)}, this is a friendly reminder about your upcoming appointment at <strong>${escapeHtml(opts.businessName)}</strong>.</p>
      ${detailTable([
        ["Service", opts.serviceName],
        ["When", when],
      ])}`),
  };
};

/**
 * Computes when the appointment reminder should be sent:
 *  - default: 24 hours before the appointment;
 *  - if the appointment starts within 24 hours (e.g. booked for tomorrow),
 *    the 24h mark is already in the past, so the reminder moves to 5 hours
 *    before the start (only when that is still in the future).
 */
export const computeReminderAt = (startAt: Date, now = new Date()): Date | null => {
  const reminderAt = new Date(startAt.getTime() - 24 * 60 * 60 * 1000);
  if (reminderAt.getTime() > now.getTime()) return reminderAt;
  const shortNotice = new Date(startAt.getTime() - 5 * 60 * 60 * 1000);
  return shortNotice.getTime() > now.getTime() ? shortNotice : null;
};

/**
 * Sends the appointment confirmation email immediately via SMTP and records
 * an honest SENT/FAILED status in `notifications`. Also queues a reminder
 * row (status PENDING, reminder_at) for the scheduled worker. Never throws —
 * a notification failure must never fail a booking.
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
    timezone?: string | null;
  },
) => {
  const reminderAt = computeReminderAt(input.startAt);

  // 1. Confirmation — send now via SMTP
  const mail = buildConfirmationEmail({
    businessName: input.businessName ?? "our studio",
    serviceName: input.serviceName ?? "Your appointment",
    startAt: input.startAt,
    customerName: input.customerName ?? "there",
    timezone: input.timezone,
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

  // 2. Reminder — queue for the scheduled worker (24h before, or 5h before
  //    for next-day / short-notice bookings)
  if (reminderAt) {
    const { error } = await sb.from("notifications").insert({
      business_id: input.businessId,
      appointment_id: input.appointmentId,
      customer_id: input.customerId,
      channel: "EMAIL",
      type: "APPOINTMENT_REMINDER",
      recipient_email: input.recipient,
      scheduled_for: reminderAt.toISOString(),
      reminder_at: reminderAt.toISOString(),
      status: "PENDING",
    });
    if (error) console.warn("Failed to queue reminder:", error.message);
  }
};

type ReminderJob = {
  id: string;
  business_id: string;
  appointment_id: string | null;
  customer_id: string | null;
  recipient_email: string | null;
  start_at: string | null;
  business_name: string | null;
  business_timezone: string | null;
  service_name: string | null;
  customer_first_name: string | null;
  customer_last_name: string | null;
  customer_email: string | null;
};

/**
 * Shared worker logic for due reminder notifications. Rows are claimed
 * atomically inside the database (PENDING -> PROCESSING) via the secret-gated
 * SECURITY DEFINER RPC `claim_due_reminders`, then each email is sent and
 * completed via `complete_reminder`. No table access happens directly, so
 * neither RLS nor a service_role key is involved.
 */
export const processDueReminders = async (
  sb: SupabaseLike & Pick<SBClient, "rpc">,
  opts: { secret: string; batchSize?: number } = {},
): Promise<{ claimed: number; sent: number; failed: number; errors: string[] }> => {
  const errors: string[] = [];
  let sent = 0;
  let failed = 0;

  const { data: jobs, error } = await sb.rpc("claim_due_reminders", {
    p_secret: opts.secret,
    p_batch_size: opts.batchSize ?? 25,
  });

  if (error) {
    errors.push(`Claim failed: ${error.message}`);
    return { claimed: 0, sent, failed, errors };
  }

  for (const raw of jobs ?? []) {
    const job = raw as unknown as ReminderJob;

    const startAtStr = job.start_at;
    if (!startAtStr) {
      await sb.rpc("complete_reminder", {
        p_secret: opts.secret,
        p_id: job.id,
        p_ok: false,
        p_error: "No appointment time",
      });
      failed++;
      errors.push(`${job.id}: no appointment time`);
      continue;
    }

    const mail = buildReminderEmail({
      businessName: job.business_name ?? "our studio",
      serviceName: job.service_name ?? "your appointment",
      startAt: new Date(startAtStr),
      customerName:
        [job.customer_first_name, job.customer_last_name].filter(Boolean).join(" ").trim() || "there",
      timezone: job.business_timezone,
    });
    const result = await sendEmail({
      to: job.recipient_email ?? job.customer_email ?? "",
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });

    await sb.rpc("complete_reminder", {
      p_secret: opts.secret,
      p_id: job.id,
      p_ok: result.ok,
      p_error: result.error ?? null,
      p_message_id: result.messageId ?? null,
    });

    if (result.ok) sent++;
    else {
      failed++;
      errors.push(`${job.id}: ${result.error}`);
    }
  }

  return { claimed: (jobs ?? []).length, sent, failed, errors };
};
