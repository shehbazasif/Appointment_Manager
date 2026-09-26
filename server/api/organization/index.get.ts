import { requireTenant, serializeBusiness } from "../../utils/auth";
import { getUserClient } from "../../utils/supabase";

export default defineEventHandler(async (event) => {
  const { businessId, settings } = await requireTenant(event);
  const sb = await getUserClient(event);

  const { data: business, error } = await sb
    .from("businesses")
    .select("*")
    .eq("id", businessId)
    .single();

  if (error || !business)
    throw createError({ statusCode: 404, statusMessage: "Business profile not found." });

  return serializeBusiness(business, settings);
});
