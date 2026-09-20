import { eq } from "drizzle-orm";
import { readValidatedBody, setResponseStatus } from "h3";
import { bootstrapSchema } from "#shared/schemas/auth";
import { memberships, organizations, users } from "../../db/schema";
import { requireDatabase } from "../../utils/database";
import { requireAuthUser } from "../../utils/auth";

const metadataString = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

/**
 * Idempotent tenant provisioning for a freshly registered Supabase user.
 * Creates the tenant `users` row (id = Supabase auth uid), the organization
 * and the OWNER membership. Safe to call multiple times.
 */
export default defineEventHandler(async (event) => {
  const authUser = await requireAuthUser(event);
  // Body is optional: onboarding retries bootstrap with the signup metadata.
  const body = await readValidatedBody(event, (raw) =>
    bootstrapSchema.parse(raw && typeof raw === "object" ? raw : {}),
  );

  const metadata = authUser.userMetadata;
  const firstName =
    body.firstName ?? metadataString(metadata.first_name) ?? "";
  const lastName = body.lastName ?? metadataString(metadata.last_name) ?? "";
  const businessName =
    body.businessName ??
    metadataString(metadata.pending_business_name) ??
    metadataString(metadata.business_name);
  const businessSlug =
    body.businessSlug ??
    metadataString(metadata.pending_business_slug) ??
    metadataString(metadata.business_slug);

  const database = requireDatabase();

  const existingMembership = await database.query.memberships.findFirst({
    where: eq(memberships.userId, authUser.id),
    with: { organization: true },
  });
  if (existingMembership && existingMembership.status === "ACTIVE")
    return {
      created: false,
      user: { id: authUser.id, email: authUser.email },
      organization: existingMembership.organization,
    };

  if (!businessName || !businessSlug)
    throw createError({
      statusCode: 422,
      statusMessage:
        "Business name and slug are required to create your workspace.",
      data: { code: "MISSING_BUSINESS_DETAILS" },
    });

  const slugConflict = await database.query.organizations.findFirst({
    where: eq(organizations.slug, businessSlug),
  });
  if (slugConflict && slugConflict.id !== existingMembership?.organizationId)
    throw createError({
      statusCode: 409,
      statusMessage: "This booking slug is already in use.",
    });

  const result = await database.transaction(async (transaction) => {
    const [userRow] = await transaction
      .insert(users)
      .values({
        // Tenant user id mirrors the Supabase auth uid.
        id: authUser.id,
        email: authUser.email,
        // Credentials are managed by Supabase Auth; the legacy column stays
        // satisfied with a non-secret placeholder.
        passwordHash: "supabase-managed",
        firstName: firstName || "Business",
        lastName: lastName || "Owner",
      })
      // A database trigger or a retried request may have already mirrored the
      // auth user into the tenant table — upsert keeps it in sync either way.
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: authUser.email,
          firstName: firstName || "Business",
          lastName: lastName || "Owner",
          status: "ACTIVE",
          updatedAt: new Date(),
        },
      })
      .returning();

    const [organization] = await transaction
      .insert(organizations)
      .values({
        name: businessName,
        slug: businessSlug,
        email: authUser.email,
        bookingActive: false,
      })
      .returning();

    await transaction
      .insert(memberships)
      .values({
        organizationId: organization.id,
        userId: userRow.id,
        role: "OWNER",
      })
      .onConflictDoNothing();

    return { user: userRow, organization };
  });

  setResponseStatus(event, 201);
  return {
    created: true,
    user: { id: result.user.id, email: result.user.email },
    organization: result.organization,
  };
});
