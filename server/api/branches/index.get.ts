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
  // how much is inside each branch (shown before deleting one)
  const counts = await Promise.all(
    (data ?? []).map(async (b: any) => {
      const [a, c] = await Promise.all([
        sb.from("appointments").select("id", { count: "exact", head: true }).eq("business_id", b.id),
        sb.from("customers").select("id", { count: "exact", head: true }).eq("business_id", b.id),
      ]);
      return { appointments: a.count ?? 0, customers: c.count ?? 0 };
    }),
  );
  return {
    head: { id: homeBusiness.id, name: (homeBusiness as any).name, city: (homeBusiness as any).city ?? null },
    branches: (data ?? []).map((b: any, i: number) => ({ id: b.id, name: b.name, city: b.city ?? null, status: b.status, ...counts[i] })),
  };
});
