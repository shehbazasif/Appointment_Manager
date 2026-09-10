import { eq } from "drizzle-orm";
import { organizations, services, staff } from "../../db/schema";
import { requireDatabase } from "../../utils/database";

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, "slug");
  if (!slug)
    throw createError({
      statusCode: 400,
      statusMessage: "Business slug is required.",
    });
  const database = requireDatabase();
  const business = await database.query.organizations.findFirst({
    where: eq(organizations.slug, slug),
    with: { services: true, staff: true },
  });
  if (!business || !business.bookingActive)
    throw createError({
      statusCode: 404,
      statusMessage: "Booking page not found.",
    });
  return {
    business: {
      id: business.id,
      name: business.name,
      slug: business.slug,
      description: business.description,
      city: business.city,
      country: business.country,
      timezone: business.timezone,
    },
    services: business.services.filter((service) => service.active),
    staff: business.staff.filter((member) => member.active),
  };
});
