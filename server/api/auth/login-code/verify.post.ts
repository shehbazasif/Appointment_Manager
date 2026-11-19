import { z } from "zod";
import { requireAuthUser } from "../../../utils/auth";
import { getUserClient } from "../../../utils/supabase";
import { consumeVerificationCode } from "../../../services/verification";
import { appSupportsLoginCode, trustDevice } from "../../../utils/deviceTrust";

const bodySchema = z.object({ code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code.") });

/**
 * 2-step login, step 2: check the emailed code (5 tries per code, codes expire
 * after 15 minutes). On success this browser is trusted for 2 days of activity.
 */
export default defineEventHandler(async (event) => {
  const authUser = await requireAuthUser(event);
  const { code } = await readValidatedBody(event, bodySchema.parse);
  const sb = await getUserClient(event);
  const payload = await consumeVerificationCode(sb, { userId: authUser.id, kind: "LOGIN", code });
  if (!payload)
    throw createError({ statusCode: 400, statusMessage: "Wrong or expired code. Check the latest email or send a new code." });
  const token = trustDevice(event, authUser.id);
  // the Android app stores this itself (the website uses the httpOnly cookie only)
  return appSupportsLoginCode(event) ? { ok: true, deviceToken: token } : { ok: true };
});
