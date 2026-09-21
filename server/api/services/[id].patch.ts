import { readValidatedBody } from "h3";
import { serviceSchema } from "#shared/schemas/business";
import { requireTenant } from "../../utils/auth";
import { getSupabaseAdmin } from "../../utils/supabase";

export default defineEventHandler(async (event) => {
  const { organizationId } = await requireTenant(event);
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "Service id is required." });

  const input = await readValidatedBody(event, serviceSchema.partial().parse);
  const sb = getSupabaseAdmin();

  const { data: service, error } = await sb
    .from("services")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", organizationId)
    .select()
    .single();

  if (error || !service)
    throw createError({ statusCode: 404, statusMessage: "Service not found." });

  return service;
});
