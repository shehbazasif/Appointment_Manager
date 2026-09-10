import { eq } from "drizzle-orm";
import { getQuery } from "h3";
import { organizations } from "../../../db/schema";
import { calculateAvailability } from "../../../services/availability";
import { requireDatabase } from "../../../utils/database";

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, "slug");
  const query = getQuery(event);
  const date = new Date(String(query.date ?? ""));
  const serviceId = String(query.serviceId ?? "");
  if (!slug || Number.isNaN(date.getTime()) || !serviceId)
    throw createError({
      statusCode: 400,
      statusMessage: "date and serviceId are required.",
    });
  const database = requireDatabase();
  const business = await database.query.organizations.findFirst({
    where: eq(organizations.slug, slug),
  });
  if (!business || !business.bookingActive)
    throw createError({
      statusCode: 404,
      statusMessage: "Booking page not found.",
    });
  return calculateAvailability(
    database,
    business.id,
    date,
    serviceId,
    query.staffId ? String(query.staffId) : undefined,
  );
});
