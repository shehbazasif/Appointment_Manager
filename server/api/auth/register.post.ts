import argon2 from "argon2";
import { eq } from "drizzle-orm";
import { readValidatedBody, setResponseStatus } from "h3";
import { registerSchema } from "#shared/schemas/auth";
import { memberships, organizations, users } from "../../db/schema";
import { requireDatabase } from "../../utils/database";
import { createSession } from "../../utils/session";

export default defineEventHandler(async (event) => {
  const input = await readValidatedBody(event, registerSchema.parse);
  const database = requireDatabase();
  const existingUser = await database.query.users.findFirst({
    where: eq(users.email, input.email.toLowerCase()),
  });
  if (existingUser)
    throw createError({
      statusCode: 409,
      statusMessage: "An account with this email already exists.",
    });
  const existingOrganization = await database.query.organizations.findFirst({
    where: eq(organizations.slug, input.businessSlug),
  });
  if (existingOrganization)
    throw createError({
      statusCode: 409,
      statusMessage: "This booking slug is already in use.",
    });

  const passwordHash = await argon2.hash(input.password, {
    type: argon2.argon2id,
  });
  const result = await database.transaction(async (transaction) => {
    const [user] = await transaction
      .insert(users)
      .values({
        email: input.email.toLowerCase(),
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
      })
      .returning({ id: users.id });
    const [organization] = await transaction
      .insert(organizations)
      .values({
        name: input.businessName,
        slug: input.businessSlug,
        email: input.email.toLowerCase(),
        bookingActive: false,
      })
      .returning({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
      });
    await transaction
      .insert(memberships)
      .values({
        organizationId: organization.id,
        userId: user.id,
        role: "OWNER",
      });
    return { user, organization };
  });

  createSession(event, result.user.id, result.organization.id);
  setResponseStatus(event, 201);
  return {
    user: {
      id: result.user.id,
      email: input.email.toLowerCase(),
      firstName: input.firstName,
      lastName: input.lastName,
    },
    organization: result.organization,
  };
});
