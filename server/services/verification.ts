import { createHash, randomInt } from "node:crypto";
import type { SupabaseClient as SBClient } from "@supabase/supabase-js";
import { sendEmail } from "./notifications";

type SupabaseLike = Pick<SBClient, "from">;

const CODE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;
const MAX_CODES_PER_WINDOW = 3;
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes

const hashCode = (userId: string, code: string) =>
  createHash("sha256").update(`${userId}:${code}`).digest("hex");

export type VerificationKind = "EMAIL_CHANGE" | "PHONE_CHANGE";

/**
 * Rate-limits code requests per user+kind (3 per 10 minutes), then generates a
 * 6-digit code, stores only its hash, and emails it to the account's CURRENT
 * address. Throws an H3 error with a friendly message on failure.
 */
export const issueVerificationCode = async (
  sb: SupabaseLike,
  input: {
    userId: string;
    kind: VerificationKind;
    payload: Record<string, unknown>;
    recipientEmail: string;
    purposeLine: string;
  },
): Promise<void> => {
  const windowStart = new Date(Date.now() - WINDOW_MS).toISOString();
  const { count } = await sb
    .from("account_verification_codes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", input.userId)
    .eq("kind", input.kind)
    .gte("created_at", windowStart);

  if ((count ?? 0) >= MAX_CODES_PER_WINDOW) {
    throw createError({
      statusCode: 429,
      statusMessage: "Too many verification attempts. Please try again in 10 minutes.",
    });
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const { error } = await sb.from("account_verification_codes").insert({
    user_id: input.userId,
    kind: input.kind,
    code_hash: hashCode(input.userId, code),
    payload: input.payload,
    expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
  });
  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: "Could not start verification. Please try again.",
    });
  }

  const result = await sendEmail({
    to: input.recipientEmail,
    subject: `Your RantevouOS verification code: ${code}`,
    text: `Hello,\n\n${input.purposeLine}\n\nYour verification code is: ${code}\n\nIt expires in 15 minutes. If you didn't request this, you can ignore this email.\n\n— RantevouOS`,
    html: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#24262d">
      <h2 style="margin:0 0 8px">Verify your change</h2>
      <p style="margin:0 0 16px;color:#6b7280;font-size:14px">${input.purposeLine}</p>
      <div style="font-size:32px;font-weight:bold;letter-spacing:8px;padding:16px;background:#faf9f6;border:1px solid #e7e5e4;border-radius:12px;text-align:center">${code}</div>
      <p style="margin:16px 0 0;color:#9ca3af;font-size:12px">This code expires in 15 minutes. If you didn't request it, ignore this email.</p>
    </div>`,
  });

  if (!result.ok) {
    throw createError({
      statusCode: 503,
      statusMessage:
        result.error === "SMTP_NOT_CONFIGURED"
          ? "Email service is not configured yet. Ask the administrator to set the SMTP environment variables."
          : "Could not send the verification email. Please try again.",
    });
  }
};

/**
 * Checks a submitted code against the newest valid row. Counts attempts to
 * block brute force. Deletes the row on success. Returns the stored payload
 * or null when invalid/expired/exhausted.
 */
export const consumeVerificationCode = async (
  sb: SupabaseLike,
  input: { userId: string; kind: VerificationKind; code: string },
): Promise<Record<string, unknown> | null> => {
  const { data: rows } = await sb
    .from("account_verification_codes")
    .select("id, code_hash, payload, attempts, expires_at")
    .eq("user_id", input.userId)
    .eq("kind", input.kind)
    .order("created_at", { ascending: false })
    .limit(5);

  const now = Date.now();
  const match = (rows ?? []).find(
    (r) =>
      r.code_hash === hashCode(input.userId, input.code) &&
      new Date(r.expires_at).getTime() > now &&
      (r.attempts ?? 0) < MAX_ATTEMPTS,
  );

  if (!match) {
    // Bump attempts on recent rows so guessing is capped even across retries.
    await Promise.all(
      (rows ?? [])
        .filter((r) => new Date(r.expires_at).getTime() > now && (r.attempts ?? 0) < MAX_ATTEMPTS)
        .map((r) =>
          sb
            .from("account_verification_codes")
            .update({ attempts: (r.attempts ?? 0) + 1 })
            .eq("id", r.id),
        ),
    );
    return null;
  }

  await sb.from("account_verification_codes").delete().eq("id", match.id);
  return (match.payload ?? {}) as Record<string, unknown>;
};
