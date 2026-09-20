import { eq } from "drizzle-orm";
import { readValidatedBody } from "h3";
import { onboardingSchema } from "#shared/schemas/auth";
import { organizations } from "../db/schema";
import { requireDatabase } from "../utils/database";
import { requireTenant } from "../utils/auth";

/** Updates business profile fields for the authenticated tenant. */
export default defineEventHandler(async (event) => {
  const { organizationId } = await requireTenant(event);
  const input = await readValidatedBody(event, onboardingSchema.parse);
  const updates = Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  );
  if (Object.keys(updates).length === 0)
    throw createError({
      statusCode: 400,
      statusMessage: "No profile fields to update.",
    });
  const [organization] = await requireDatabase()
    .update(organizations)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(organizations.id, organizationId))
    .returning();
  if (!organization)
    throw createError({
      statusCode: 404,
      statusMessage: "Organization not found.",
    });
  return organization;
});
