import { readValidatedBody, setResponseStatus } from "h3";
import { serviceSchema } from "#shared/schemas/business";
import { requireTenant } from "../../utils/auth";
import { getUserClient } from "../../utils/supabase";

export default defineEventHandler(async (event) => {
  const { businessId } = await requireTenant(event);
  const input = await readValidatedBody(event, serviceSchema.parse);
  const sb = await getUserClient(event);

  const { data: service, error } = await sb
    .from("services")
    .insert({
      business_id: businessId,
      name: input.name,
      description: input.description ?? null,
      duration_minutes: input.durationMinutes,
      price: input.priceCents / 100,
      currency: "EUR",
      status: input.active ? "ACTIVE" : "INACTIVE",
    })
    .select()
    .single();

  if (error) throw createError({ statusCode: 500, statusMessage: error.message });
  setResponseStatus(event, 201);
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
