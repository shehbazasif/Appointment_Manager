import { and, asc, eq, ilike, or } from "drizzle-orm";
import { getQuery } from "h3";
import { customers } from "../../db/schema";
import { requireDatabase } from "../../utils/database";
import { requireTenant } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  const { organizationId } = await requireTenant(event);
  const search = String(getQuery(event).search ?? "").trim();
  const database = requireDatabase();
  const where = search
    ? or(
        ilike(customers.firstName, `%${search}%`),
        ilike(customers.lastName, `%${search}%`),
        ilike(customers.phone, `%${search}%`),
      )
    : undefined;
  return database
    .select()
    .from(customers)
    .where(
      where
        ? and(eq(customers.organizationId, organizationId), where)
        : eq(customers.organizationId, organizationId),
    )
    .orderBy(asc(customers.lastName), asc(customers.firstName));
});
