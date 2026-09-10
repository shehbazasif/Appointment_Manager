import argon2 from "argon2";
import { eq } from "drizzle-orm";
import { readValidatedBody } from "h3";
import { loginSchema } from "#shared/schemas/auth";
import { memberships, organizations, users } from "../../db/schema";
import { requireDatabase } from "../../utils/database";
import { createSession } from "../../utils/session";

export default defineEventHandler(async (event) => {
  const input = await readValidatedBody(event, loginSchema.parse);
  const database = requireDatabase();
  const user = await database.query.users.findFirst({
    where: eq(users.email, input.email.toLowerCase()),
  });
  if (!user || !(await argon2.verify(user.passwordHash, input.password)))
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid email or password.",
    });
  const membership = await database.query.memberships.findFirst({
    where: eq(memberships.userId, user.id),
    with: { organization: true },
  });
  if (!membership || membership.status !== "ACTIVE")
    throw createError({
      statusCode: 403,
      statusMessage: "No active business membership found.",
    });
  createSession(event, user.id, membership.organizationId);
  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    },
    organization: membership.organization,
  };
});
