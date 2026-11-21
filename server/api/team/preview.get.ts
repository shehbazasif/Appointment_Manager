import { getQuery } from "h3";
import { getAnonClient } from "../../utils/supabase";
import { hashInviteToken } from "../../utils/team";

/** What the /join page shows before signing in: which business, which email. */
export default defineEventHandler(async (event) => {
  const token = String(getQuery(event).token ?? "").trim();
  if (!token || token.length > 200) throw createError({ statusCode: 400, statusMessage: "Invalid invitation link." });
  const { data, error } = await getAnonClient().rpc("invitation_preview", { p_token_hash: hashInviteToken(token) });
  if (error) throw createError({ statusCode: 500, statusMessage: error.message });
  if (!data) throw createError({ statusCode: 404, statusMessage: "This invitation link is not valid." });
  return data;
});
