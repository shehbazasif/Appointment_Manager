import { requireTenant } from "../../utils/auth";
import { getSupabaseAdmin } from "../../utils/supabase";

export default defineEventHandler(async (event) => {
  const { organizationId } = await requireTenant(event);
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "Service id is required." });

  const sb = getSupabaseAdmin();

  const { data: service, error } = await sb
    .from("services")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", organizationId)
    .select("id")
    .single();

  if (error || !service)
    throw createError({ statusCode: 404, statusMessage: "Service not found." });

  return { success: true, id: service.id };
});
