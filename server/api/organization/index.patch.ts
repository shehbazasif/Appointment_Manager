import { readValidatedBody } from "h3";
import { organizationSettingsSchema } from "#shared/schemas/business";
import { requireTenant } from "../../utils/auth";
import { getSupabaseAdmin } from "../../utils/supabase";

export default defineEventHandler(async (event) => {
  const { organizationId } = await requireTenant(event);
  const input = await readValidatedBody(event, organizationSettingsSchema.parse);
  const sb = getSupabaseAdmin();

  const { data: updated, error } = await sb
    .from("organizations")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", organizationId)
    .select()
    .single();

  if (error || !updated)
    throw createError({ statusCode: 404, statusMessage: "Business profile not found." });

  return updated;
});
