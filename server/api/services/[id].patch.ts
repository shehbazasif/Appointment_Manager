import { and, eq } from "drizzle-orm";
import { readValidatedBody } from "h3";
import { serviceSchema } from "#shared/schemas/business";
import { services } from "../../db/schema";
import { requireDatabase } from "../../utils/database";
import { requireSession } from "../../utils/session";

export default defineEventHandler(async (event) => {
  const { organizationId } = requireSession(event);
  const id = getRouterParam(event, "id");
  if (!id)
    throw createError({
      statusCode: 400,
      statusMessage: "Service id is required.",
    });
  const input = await readValidatedBody(event, serviceSchema.partial().parse);
  const [service] = await requireDatabase()
    .update(services)
    .set({ ...input, updatedAt: new Date() })
    .where(
      and(eq(services.id, id), eq(services.organizationId, organizationId)),
    )
    .returning();
  if (!service)
    throw createError({ statusCode: 404, statusMessage: "Service not found." });
  return service;
});
