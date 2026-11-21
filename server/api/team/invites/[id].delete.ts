import { requireTeamScope } from "../../../utils/team";

/** Head office: cancel an open invitation (head office or one of its branches). */
export default defineEventHandler(async (event) => {
  const { sb, places } = await requireTeamScope(event);
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "Invitation id is required." });
  const { error } = await sb
    .from("business_invitations")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .in("business_id", places.map((p) => p.id));
  if (error) throw createError({ statusCode: 400, statusMessage: error.message });
  return { ok: true };
});
