import { readValidatedBody } from "h3";
import { serviceSchema } from "#shared/schemas/business";
import { requireTenant } from "../../utils/auth";
import { getUserClient } from "../../utils/supabase";

export default defineEventHandler(async (event) => {
  const { businessId } = await requireTenant(event);
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "Service id is required." });

  const input = await readValidatedBody(event, serviceSchema.partial().parse);
  const sb = await getUserClient(event);

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.name !== undefined) updates.name = input.name;
  if (input.description !== undefined) updates.description = input.description;
  if (input.durationMinutes !== undefined) updates.duration_minutes = input.durationMinutes;
  if (input.priceCents !== undefined) updates.price = input.priceCents / 100;
  if (input.active !== undefined) updates.status = input.active ? "ACTIVE" : "INACTIVE";

  const { data: service, error } = await sb
    .from("services")
    .update(updates)
    .eq("id", id)
    .eq("business_id", businessId)
    .select()
    .single();

  if (error || !service)
    throw createError({ statusCode: 404, statusMessage: "Service not found." });

  return {
    id: service.id,
    businessId: service.business_id,
    name: service.name,
    description: service.description ?? null,
    category: "General",
    durationMinutes: service.duration_minutes,
    priceCents: Math.round(Number(service.price) * 100),
    currency: service.currency ?? "EUR",
    active: service.status === "ACTIVE",
    accent: "#ca7481",
  };
});
