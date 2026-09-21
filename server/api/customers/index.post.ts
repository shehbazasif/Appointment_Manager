import { readValidatedBody, setResponseStatus } from "h3";
import { customerSchema } from "#shared/schemas/business";
import { requireTenant } from "../../utils/auth";
import { getSupabaseAdmin } from "../../utils/supabase";

export default defineEventHandler(async (event) => {
  const { organizationId } = await requireTenant(event);
  const input = await readValidatedBody(event, customerSchema.parse);
  const sb = getSupabaseAdmin();

  const { data: customer, error } = await sb
    .from("customers")
    .insert({ ...input, organization_id: organizationId })
    .select()
    .single();

  if (error) throw createError({ statusCode: 500, statusMessage: error.message });
  setResponseStatus(event, 201);
  return customer;
});
