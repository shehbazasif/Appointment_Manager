import { phoneChangeRequestSchema } from "#shared/schemas/account";
import { requireAuthUser } from "../../../utils/auth";
import { getUserClient } from "../../../utils/supabase";
import { issueVerificationCode } from "../../../services/verification";

/**
 * Step 1 of mobile number change: email a 6-digit code to the account's
 * current address to authorize storing the new number.
 */
export default defineEventHandler(async (event) => {
  const authUser = await requireAuthUser(event);
  const body = await readValidatedBody(event, phoneChangeRequestSchema.parse);
  const sb = await getUserClient(event);

  await issueVerificationCode(sb, {
    userId: authUser.id,
    kind: "PHONE_CHANGE",
    payload: { newPhone: body.newPhone },
    recipientEmail: authUser.email,
    purposeLine: `You asked to change your RantevouOS mobile number to ${body.newPhone}. Enter this code to confirm.`,
  });

  return { ok: true, sentTo: authUser.email };
});
