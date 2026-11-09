import { readValidatedBody, setResponseStatus } from "h3";
import { serviceSchema } from "#shared/schemas/business";
import { requireTenant } from "../../utils/auth";
import { getUserClient } from "../../utils/supabase";
import { isMissingCategoryColumn, serializeService } from "../../utils/services";

export default defineEventHandler(async (event) => {
  const { businessId, business, settings } = await requireTenant(event);
  const input = await readValidatedBody(event, serviceSchema.parse);
  const sb = await getUserClient(event);

  const row: Record<string, unknown> = {
    business_id: businessId,
    name: input.name,
    description: input.description ?? null,
    duration_minutes: input.durationMinutes,
    price: input.priceCents / 100,
    // the price is charged in this currency (default: the business currency)
    currency:
      input.currency ??
      (business as any)?.currency ??
      (settings as any)?.currency ??
      "EUR",
    category: input.category || "General",
    status: input.active ? "ACTIVE" : "INACTIVE",
  };

  let { data: service, error } = await sb.from("services").insert(row).select().single();
  if (isMissingCategoryColumn(error)) {
    delete row.category;
    ({ data: service, error } = await sb.from("services").insert(row).select().single());
  }

  if (error || !service)
    throw createError({ statusCode: 500, statusMessage: error?.message ?? "Could not create service." });
  setResponseStatus(event, 201);
  return serializeService(service);
});
