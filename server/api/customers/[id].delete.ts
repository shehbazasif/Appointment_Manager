import { requireTenant } from "../../utils/auth";
import { getSupabaseAdmin } from "../../utils/supabase";

export default defineEventHandler(async (event) => {
  const { organizationId } = await requireTenant(event);
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "Customer ID is required." });

  const sb = getSupabaseAdmin();

  // Anonymize customer data — soft delete preserving foreign keys
  const { data: anonymized, error } = await sb
    .from("customers")
    .update({
      first_name: "Deleted",
      last_name: "Customer",
      email: null,
      phone: "0000000000",
      notes: "Customer account anonymized/deleted.",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("organization_id", organizationId)
    .select("id")
    .single();

  if (error || !anonymized)
    throw createError({ statusCode: 404, statusMessage: "Customer not found." });

  return { success: true, message: "Customer data has been anonymized." };
});
