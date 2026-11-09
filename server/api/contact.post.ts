import { getRequestIP, readBody, createError } from "h3";
import { contactSchema } from "#shared/schemas/contact";
import { isEmailConfigured, sendEmail } from "../services/notifications";

/**
 * Public contact form → email to the platform owner (CONTACT_TO_EMAIL).
 * Protected by a honeypot field and a small in-memory rate limit per IP.
 */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? "unknown";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    throw createError({
      statusCode: 429,
      statusMessage: "Too many messages. Please wait a few minutes and try again.",
    });
  }

  const parsed = contactSchema.safeParse(await readBody(event).catch(() => ({})));
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message ?? "Please check the form and try again.",
    });
  }
  const input = parsed.data;

  // Honeypot filled → pretend success so bots learn nothing.
  if (input.website) return { ok: true };

  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear(); // keep memory bounded

  const to = String(process.env.CONTACT_TO_EMAIL ?? "").trim();
  if (!to || !isEmailConfigured()) {
    console.error("[contact] CONTACT_TO_EMAIL or SMTP is not configured — message not sent.");
    throw createError({
      statusCode: 503,
      statusMessage: `The contact form is not available right now. Please email us at ${BRAND.email}.`,
    });
  }

  const rows: [string, string][] = [
    ["Name", input.name],
    ["Email", input.email],
    ["Business", input.business || "—"],
    ["Topic", input.topic],
  ];
  const html = `
  <div style="font-family:system-ui,sans-serif;font-size:14px;color:#1c1917">
    <h2 style="margin:0 0 12px">New message from the ${escapeHtml(BRAND.name)} website</h2>
    <table style="border-collapse:collapse">${rows
      .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#78716c">${k}</td><td style="padding:4px 0"><b>${escapeHtml(v)}</b></td></tr>`)
      .join("")}</table>
    <p style="white-space:pre-wrap;margin-top:16px;padding:12px;border-radius:8px;background:#f5f5f4">${escapeHtml(input.message)}</p>
  </div>`;
  const text = `${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\n${input.message}`;

  const result = await sendEmail({
    to,
    subject: `[${BRAND.name} contact] ${input.topic} — ${input.name}`,
    html,
    text,
    fromName: `${BRAND.name} Website`,
    replyTo: input.email,
  });
  if (!result.ok) {
    throw createError({
      statusCode: 502,
      statusMessage: `We couldn't send your message right now. Please try again or email ${BRAND.email}.`,
    });
  }
  return { ok: true };
});
