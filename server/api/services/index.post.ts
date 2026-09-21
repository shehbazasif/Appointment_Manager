import { readValidatedBody, setResponseStatus } from "h3";
import { serviceSchema } from "#shared/schemas/business";
import { requireTenant } from "../../utils/auth";
import { getSupabaseAdmin } from "../../utils/supabase";

export default defineEventHandler(async (event) => {
  const { organizationId } = await requireTenant(event);
  const input = await readValidatedBody(event, serviceSchema.parse);
  const sb = getSupabaseAdmin();

  const { data: service, error } = await sb
    .from("services")
    .insert({ ...input, organization_id: organizationId })
    .select()
    .single();

  if (error) throw createError({ statusCode: 500, statusMessage: error.message });
  setResponseStatus(event, 201);
  return service;
});
