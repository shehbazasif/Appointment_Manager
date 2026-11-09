import { readValidatedBody } from "h3";
import { serviceSchema } from "#shared/schemas/business";
import { requireTenant } from "../../utils/auth";
import { getUserClient } from "../../utils/supabase";
import { isMissingCategoryColumn, serializeService } from "../../utils/services";

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
  if (input.currency !== undefined) updates.currency = input.currency;
  if (input.category !== undefined) updates.category = input.category || "General";
  if (input.active !== undefined) updates.status = input.active ? "ACTIVE" : "INACTIVE";

  const run = () =>
    sb.from("services").update(updates).eq("id", id).eq("business_id", businessId).select().single();

  let { data: service, error } = await run();
  if (isMissingCategoryColumn(error)) {
    delete updates.category;
    ({ data: service, error } = await run());
  }

  if (error || !service)
    throw createError({ statusCode: 404, statusMessage: error?.message ?? "Service not found." });

  return serializeService(service);
});
