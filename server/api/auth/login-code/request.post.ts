import { requireAuthUser } from "../../../utils/auth";
import { getUserClient } from "../../../utils/supabase";
import { issueVerificationCode } from "../../../services/verification";

/**
 * 2-step login, step 1: email a 6-digit code to the signed-in user's own
 * address. Limited to 3 codes per 10 minutes (issueVerificationCode).
 */
export default defineEventHandler(async (event) => {
  const authUser = await requireAuthUser(event);
  const sb = await getUserClient(event);
  await issueVerificationCode(sb, {
    userId: authUser.id,
    kind: "LOGIN",
    payload: {},
    recipientEmail: authUser.email,
    purposeLine: `Someone (hopefully you) is signing in to ${BRAND.name}. Enter this code to finish signing in. If this wasn't you, change your password now.`,
  });
  // show only a hint of the address on screen
  const [name, domain] = authUser.email.split("@");
  return { ok: true, sentTo: `${(name ?? "").slice(0, 2)}•••@${domain ?? ""}` };
});
