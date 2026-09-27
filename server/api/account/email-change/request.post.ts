import { emailChangeRequestSchema } from "#shared/schemas/account";
import { requireAuthUser } from "../../../utils/auth";
import { getUserClient } from "../../../utils/supabase";
import { issueVerificationCode } from "../../../services/verification";

/**
 * Step 1 of email change: verify the requester, email a 6-digit code to the
 * CURRENT address. The new address is stored (unconfirmed) in the code row.
 * GoTrue itself rejects addresses already registered when the change is
 * applied, so no cross-account uniqueness check is needed here.
 */
export default defineEventHandler(async (event) => {
  const authUser = await requireAuthUser(event);
  const body = await readValidatedBody(event, emailChangeRequestSchema.parse);
  const sb = await getUserClient(event);

  if (body.newEmail === authUser.email) {
    throw createError({
      statusCode: 400,
      statusMessage: "That is already your current email address.",
    });
  }

  await issueVerificationCode(sb, {
    userId: authUser.id,
    kind: "EMAIL_CHANGE",
    payload: { newEmail: body.newEmail },
    recipientEmail: authUser.email,
    purposeLine: `You asked to change your RantevouOS account email to ${body.newEmail}. Enter this code to confirm.`,
  });

  return { ok: true, sentTo: authUser.email };
});
