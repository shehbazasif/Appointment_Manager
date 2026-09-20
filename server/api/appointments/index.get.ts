import { and, eq, gte, lt } from "drizzle-orm";
import { getQuery } from "h3";
import { appointments, customers, services, staff } from "../../db/schema";
import { requireDatabase } from "../../utils/database";
import { requireTenant } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  const { organizationId } = await requireTenant(event);
  const query = getQuery(event);
  const start = query.start
    ? new Date(String(query.start))
    : new Date(new Date().setHours(0, 0, 0, 0));
  const end = query.end
    ? new Date(String(query.end))
    : new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return requireDatabase()
    .select({
      appointment: appointments,
      customer: customers,
      service: services,
      staff,
    })
    .from(appointments)
    .innerJoin(customers, eq(appointments.customerId, customers.id))
    .innerJoin(services, eq(appointments.serviceId, services.id))
    .innerJoin(staff, eq(appointments.staffId, staff.id))
    .where(
      and(
        eq(appointments.organizationId, organizationId),
        gte(appointments.startAt, start),
        lt(appointments.startAt, end),
      ),
    );
});
