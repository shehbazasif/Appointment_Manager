import { requireTenant } from "../../utils/auth";
import { getSupabaseAdmin } from "../../utils/supabase";

export default defineEventHandler(async (event) => {
  const { organizationId } = await requireTenant(event);
  const sb = getSupabaseAdmin();

  const { data, error } = await sb
    .from("services")
    .select("*")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true });

  if (error) throw createError({ statusCode: 500, statusMessage: error.message });
  return data ?? [];
});
