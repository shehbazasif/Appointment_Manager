import { and, eq } from "drizzle-orm";
import { services } from "../../db/schema";
import { requireDatabase } from "../../utils/database";
import { requireTenant } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  const { organizationId } = await requireTenant(event);
  const id = getRouterParam(event, "id");
  if (!id)
    throw createError({
      statusCode: 400,
      statusMessage: "Service id is required.",
    });
  const [service] = await requireDatabase()
    .update(services)
    .set({ active: false, updatedAt: new Date() })
    .where(
      and(eq(services.id, id), eq(services.organizationId, organizationId)),
    )
    .returning({ id: services.id });
  if (!service)
    throw createError({ statusCode: 404, statusMessage: "Service not found." });
  return { success: true, id: service.id };
});
