import { getQuery } from "h3";
import { requireTenant } from "../../utils/auth";
import { getSupabaseAdmin } from "../../utils/supabase";

export default defineEventHandler(async (event) => {
  const { organizationId } = await requireTenant(event);
  const search = String(getQuery(event).search ?? "").trim();
  const sb = getSupabaseAdmin();

  let q = sb
    .from("customers")
    .select("*")
    .eq("organization_id", organizationId)
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  if (search) {
    q = q.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,phone.ilike.%${search}%`
    );
  }

  const { data, error } = await q;
  if (error) throw createError({ statusCode: 500, statusMessage: error.message });
  return data ?? [];
});
