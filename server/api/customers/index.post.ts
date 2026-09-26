import { readValidatedBody, setResponseStatus } from "h3";
import { customerSchema } from "#shared/schemas/business";
import { requireTenant } from "../../utils/auth";
import { getUserClient } from "../../utils/supabase";

export default defineEventHandler(async (event) => {
  const { businessId } = await requireTenant(event);
  const input = await readValidatedBody(event, customerSchema.parse);
  const sb = await getUserClient(event);

  const { data: customer, error } = await sb
    .from("customers")
    .insert({
      business_id: businessId,
      first_name: input.firstName,
      last_name: input.lastName,
      email: input.email ?? null,
      phone: input.phone,
      notes: input.notes ?? null,
    })
    .select()
    .single();

  if (error) throw createError({ statusCode: 500, statusMessage: error.message });
  setResponseStatus(event, 201);
  return {
    id: customer.id,
    businessId: customer.business_id,
    firstName: customer.first_name,
    lastName: customer.last_name,
    email: customer.email ?? null,
    phone: customer.phone,
    notes: customer.notes ?? null,
    createdAt: customer.created_at,
  };
});
