import { and, count, eq, gte, lt } from "drizzle-orm";
import { appointments } from "../../db/schema";
import { requireDatabase } from "../../utils/database";
import { requireTenant } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  const { organizationId } = await requireTenant(event);
  const database = requireDatabase();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const rows = await database
    .select({ status: appointments.status, total: count() })
    .from(appointments)
    .where(
      and(
        eq(appointments.organizationId, organizationId),
        gte(appointments.startAt, start),
        lt(appointments.startAt, end),
      ),
    )
    .groupBy(appointments.status);
  const metrics = Object.fromEntries(
    rows.map((row) => [row.status.toLowerCase(), Number(row.total)]),
  );
  return {
    date: start.toISOString().slice(0, 10),
    total: rows.reduce((sum, row) => sum + Number(row.total), 0),
    confirmed: metrics.confirmed ?? 0,
    completed: metrics.completed ?? 0,
    cancelled: metrics.cancelled ?? 0,
    noShow: metrics.no_show ?? 0,
    pending: metrics.pending ?? 0,
  };
});
