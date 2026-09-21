import { readValidatedBody } from "h3";
import { customerSchema } from "#shared/schemas/business";
import { requireTenant } from "../../utils/auth";
import { getSupabaseAdmin } from "../../utils/supabase";

export default defineEventHandler(async (event) => {
  const { organizationId } = await requireTenant(event);
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "Customer ID is required." });

  const input = await readValidatedBody(event, customerSchema.partial().parse);
  const sb = getSupabaseAdmin();

  const { data: customer, error } = await sb
    .from("customers")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", organizationId)
    .select()
    .single();

  if (error || !customer)
    throw createError({ statusCode: 404, statusMessage: "Customer not found." });

  return customer;
});
