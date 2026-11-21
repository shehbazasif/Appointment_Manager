import { getQuery } from "h3";
import { requireTeamScope, teamError } from "../../../utils/team";

/** Head office: remove someone from the head office or a branch (not yourself, not the owner). */
export default defineEventHandler(async (event) => {
  const { sb, place } = await requireTeamScope(event);
  const userId = getRouterParam(event, "userId");
  if (!userId) throw createError({ statusCode: 400, statusMessage: "User id is required." });
  const target = place(String(getQuery(event).businessId ?? "") || null);
  const { error } = await sb.rpc("remove_business_member", { p_business_id: target.id, p_user_id: userId });
  if (error) throw teamError(error);
  return { ok: true };
});
