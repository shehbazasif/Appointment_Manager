import { asc, eq } from "drizzle-orm";
import { staff } from "../../db/schema";
import { requireDatabase } from "../../utils/database";
import { requireSession } from "../../utils/session";

export default defineEventHandler(async (event) => {
  const { organizationId } = requireSession(event);
  return requireDatabase()
    .select()
    .from(staff)
    .where(eq(staff.organizationId, organizationId))
    .orderBy(asc(staff.name));
});
