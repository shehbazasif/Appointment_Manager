import { requireTenant } from "../../utils/auth";
import { getUserClient } from "../../utils/supabase";
import { serializeService } from "../../utils/services";

export default defineEventHandler(async (event) => {
  const { businessId } = await requireTenant(event);
  const sb = await getUserClient(event);

  const { data, error } = await sb
    .from("services")
    .select("*")
    .eq("business_id", businessId)
    .order("name", { ascending: true });

  if (error) throw createError({ statusCode: 500, statusMessage: error.message });
  return (data ?? []).map(serializeService);
});
