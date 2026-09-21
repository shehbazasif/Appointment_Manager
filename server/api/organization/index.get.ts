import { requireTenant } from "../../utils/auth";
import { getSupabaseAdmin } from "../../utils/supabase";

export default defineEventHandler(async (event) => {
  const { organizationId } = await requireTenant(event);
  const sb = getSupabaseAdmin();

  const { data: organization, error } = await sb
    .from("organizations")
    .select("*")
    .eq("id", organizationId)
    .single();

  if (error || !organization)
    throw createError({ statusCode: 404, statusMessage: "Business profile not found." });

  return organization;
});
