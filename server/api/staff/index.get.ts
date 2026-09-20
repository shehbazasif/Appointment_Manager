import { asc, eq } from "drizzle-orm";
import { staff } from "../../db/schema";
import { requireDatabase } from "../../utils/database";
import { requireTenant } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  const { organizationId } = await requireTenant(event);
  return requireDatabase()
    .select()
    .from(staff)
    .where(eq(staff.organizationId, organizationId))
    .orderBy(asc(staff.name));
});
