import { readValidatedBody } from "h3";
import { z } from "zod";
import { hashInviteToken, newInviteToken, requireTeamScope, siteOrigin } from "../../../utils/team";
import { sendEmail } from "../../../services/notifications";

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  /** head office (empty) or one of its branches */
  businessId: z.string().uuid().optional().nullable(),
});

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * Head office: invite someone by email to the head office or to one of its
 * branches. They get a link to join (valid 7 days).
 */
export default defineEventHandler(async (event) => {
  const { tenant, sb, place } = await requireTeamScope(event);
  const { email: inviterEmail, userId } = tenant;
  const body = await readValidatedBody(event, bodySchema.parse);
  const email = body.email;
  const target = place(body.businessId);
  const businessId = target.id;
  const name = target.name || BRAND.name;

  if (email === inviterEmail) throw createError({ statusCode: 400, statusMessage: "That is your own email." });

  // one open invite per email: replace an older one
  await sb
    .from("business_invitations")
    .update({ revoked_at: new Date().toISOString() })
    .eq("business_id", businessId)
    .eq("email", email)
    .is("accepted_at", null)
    .is("revoked_at", null);

  const token = newInviteToken();
  const { error } = await sb.from("business_invitations").insert({
    business_id: businessId,
    email,
    role: "MANAGER",
    token_hash: hashInviteToken(token),
    invited_by: userId,
  });
  if (error) throw createError({ statusCode: 400, statusMessage: error.message });

  const link = `${siteOrigin(event)}/join?token=${encodeURIComponent(token)}`;
  const sent = await sendEmail({
    to: email,
    fromName: name,
    replyTo: inviterEmail,
    subject: `You're invited to ${name} on ${BRAND.name}`,
    text: `Hello,\n\n${inviterEmail} invited you to manage appointments for ${name} on ${BRAND.name}.\n\nOpen this link to join (valid for 7 days):\n${link}\n\nIf you did not expect this, you can ignore this email.\n\n— ${BRAND.name}`,
    html: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111827">
      <p style="font-size:18px;font-weight:bold;margin:0 0 20px;color:#2563eb">${esc(BRAND.name)}</p>
      <h2 style="margin:0 0 12px;font-size:20px">You're invited to ${esc(name)}</h2>
      <p style="margin:0 0 20px;line-height:1.5">${esc(inviterEmail)} invited you to manage appointments for <b>${esc(name)}</b>.</p>
      <a href="${link}" style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 22px;border-radius:6px;text-decoration:none;font-weight:bold">Join ${esc(name)}</a>
      <p style="margin:24px 0 0;color:#6b7280;font-size:13px;line-height:1.5">The link works for 7 days. If you did not expect this email, you can ignore it.</p>
    </div>`,
  });

  return { ok: true, emailSent: sent.ok, link: sent.ok ? undefined : link };
});
