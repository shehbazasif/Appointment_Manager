import { requireTeamScope, teamError } from "../../utils/team";

/**
 * Head office: everyone who can sign in, per place (head office and each
 * branch), plus open invitations. Head-office people already reach every
 * branch, so they are only listed under the head office.
 */
export default defineEventHandler(async (event) => {
  const { sb, places } = await requireTeamScope(event);
  const results = await Promise.all(places.map((p) => sb.rpc("business_team", { p_business_id: p.id })));
  const failed = results.find((r) => r.error);
  if (failed?.error) throw teamError(failed.error);
  const headIds = new Set(((results[0]?.data as any)?.members ?? []).map((m: any) => m.userId));
  return {
    places: places.map((p, i) => {
      const data = (results[i]!.data ?? {}) as { members?: any[]; invites?: any[] };
      return {
        ...p,
        members: (data.members ?? []).filter((m) => p.isHead || !headIds.has(m.userId)),
        invites: data.invites ?? [],
      };
    }),
  };
});
