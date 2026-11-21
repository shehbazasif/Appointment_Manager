import { requireHeadOffice } from "../../utils/auth";
import { getUserClient } from "../../utils/supabase";
import { syncBranchesFromHead } from "../../utils/branchSync";

/** Head office only: the head office itself and all its branches. */
export default defineEventHandler(async (event) => {
  const { homeBusiness } = await requireHeadOffice(event);
  const sb = await getUserClient(event);
  // keep older branches in line with the head office (logo, contact, booking settings)
  await syncBranchesFromHead(sb, homeBusiness.id).catch(() => null);
  const { data, error } = await sb
    .from("businesses")
    .select("id, name, slug, city, status, created_at")
    .eq("parent_business_id", homeBusiness.id)
    .order("created_at", { ascending: true });
  if (error) throw createError({ statusCode: 500, statusMessage: error.message });
  return {
    head: { id: homeBusiness.id, name: (homeBusiness as any).name, city: (homeBusiness as any).city ?? null },
    branches: (data ?? []).map((b: any) => ({ id: b.id, name: b.name, city: b.city ?? null, status: b.status })),
  };
});
