import { readValidatedBody } from "h3";
import { customerSchema } from "#shared/schemas/business";
import { requireTenant } from "../../utils/auth";
import { getUserClient } from "../../utils/supabase";

export default defineEventHandler(async (event) => {
  const { businessId } = await requireTenant(event);
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "Customer ID is required." });

  const input = await readValidatedBody(event, customerSchema.partial().parse);
  const sb = await getUserClient(event);

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.firstName !== undefined) updates.first_name = input.firstName;
  if (input.lastName !== undefined) updates.last_name = input.lastName;
  if (input.email !== undefined) updates.email = input.email;
  if (input.phone !== undefined) updates.phone = input.phone;
  if (input.notes !== undefined) updates.notes = input.notes;

  const { data: customer, error } = await sb
    .from("customers")
    .update(updates)
    .eq("id", id)
    .eq("business_id", businessId)
    .select()
    .single();

  if (error || !customer)
    throw createError({ statusCode: 404, statusMessage: "Customer not found." });

  return {
    id: customer.id,
    businessId: customer.business_id,
    firstName: customer.first_name,
    lastName: customer.last_name,
    email: customer.email ?? null,
    phone: customer.phone,
    notes: customer.notes ?? null,
    updatedAt: customer.updated_at,
  };
});
