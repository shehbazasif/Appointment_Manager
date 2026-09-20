import { asc, eq } from "drizzle-orm";
import { services } from "../../db/schema";
import { requireDatabase } from "../../utils/database";
import { requireTenant } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  const { organizationId } = await requireTenant(event);
  return requireDatabase()
    .select()
    .from(services)
    .where(eq(services.organizationId, organizationId))
    .orderBy(asc(services.name));
});
