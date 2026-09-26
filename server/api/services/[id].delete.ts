import { requireTenant } from "../../utils/auth";
import { getUserClient } from "../../utils/supabase";

export default defineEventHandler(async (event) => {
  const { businessId } = await requireTenant(event);
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "Service id is required." });

  const sb = await getUserClient(event);

  const { data: service, error } = await sb
    .from("services")
    .update({ status: "INACTIVE", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("business_id", businessId)
    .select("id")
    .single();

  if (error || !service)
    throw createError({ statusCode: 404, statusMessage: "Service not found." });

  return { success: true, id: service.id };
});
