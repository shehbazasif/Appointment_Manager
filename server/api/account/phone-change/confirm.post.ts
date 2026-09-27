import { phoneChangeConfirmSchema } from "#shared/schemas/account";
import { requireAuthUser } from "../../../utils/auth";
import { getUserClient } from "../../../utils/supabase";
import { consumeVerificationCode } from "../../../services/verification";

/**
 * Step 2 of phone change: consume the emailed code, store the new number in
 * user_metadata (read by /api/me and the settings UI).
 */
export default defineEventHandler(async (event) => {
  const authUser = await requireAuthUser(event);
  const body = await readValidatedBody(event, phoneChangeConfirmSchema.parse);
  const sb = await getUserClient(event);

  const payload = await consumeVerificationCode(sb, {
    userId: authUser.id,
    kind: "PHONE_CHANGE",
    code: body.code,
  });
  if (!payload || payload.newPhone !== body.newPhone) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid or expired code. Request a new one.",
    });
  }

  const { error } = await sb.auth.updateUser({
    data: { phone: body.newPhone },
  });
  if (error) {
    throw createError({
      statusCode: 400,
      statusMessage: `Could not update mobile number: ${error.message}`,
    });
  }

  return { ok: true, phone: body.newPhone };
});
