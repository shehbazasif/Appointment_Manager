import { emailChangeConfirmSchema } from "#shared/schemas/account";
import { requireAuthUser } from "../../../utils/auth";
import { getUserClient } from "../../../utils/supabase";
import { consumeVerificationCode } from "../../../services/verification";

/**
 * Step 2 of email change: consume the code, then apply the change through the
 * user's own Supabase client (JWT-authenticated — no service key needed).
 * If the Supabase project requires email confirmation, GoTrue additionally
 * sends a confirmation link to the NEW address; `applied` reflects that.
 */
export default defineEventHandler(async (event) => {
  const authUser = await requireAuthUser(event);
  const body = await readValidatedBody(event, emailChangeConfirmSchema.parse);
  const sb = await getUserClient(event);

  const payload = await consumeVerificationCode(sb, {
    userId: authUser.id,
    kind: "EMAIL_CHANGE",
    code: body.code,
  });
  if (!payload || payload.newEmail !== body.newEmail) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid or expired code. Request a new one.",
    });
  }

  const { data, error } = await sb.auth.updateUser({ email: body.newEmail });
  if (error) {
    const friendly =
      /already|registered|in use/i.test(error.message)
        ? "That email is already registered to another account."
        : `Could not update email: ${error.message}`;
    throw createError({ statusCode: 400, statusMessage: friendly });
  }

  // When the project has "confirm email changes" enabled, GoTrue holds the
  // change until the user clicks the link sent to the new address.
  const applied = data.user?.email?.toLowerCase() === body.newEmail;

  return { ok: true, email: body.newEmail, applied };
});
