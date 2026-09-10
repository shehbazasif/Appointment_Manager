import argon2 from "argon2";
import { and, eq, isNull } from "drizzle-orm";
import { readValidatedBody } from "h3";
import { verifyCodeSchema } from "#shared/schemas/auth-code";
import { authChallenges, organizations, users } from "../../db/schema";
import { requireDatabase } from "../../utils/database";
import { createSession } from "../../utils/session";

export default defineEventHandler(async (event) => {
  const input = await readValidatedBody(event, verifyCodeSchema.parse);
  const database = requireDatabase();
  const challenge = await database.query.authChallenges.findFirst({
    where: and(
      eq(authChallenges.id, input.challengeId),
      isNull(authChallenges.consumedAt),
    ),
  });
  if (
    !challenge ||
    challenge.expiresAt.getTime() < Date.now() ||
    challenge.attempts >= 5
  )
    throw createError({
      statusCode: 401,
      statusMessage: "This code has expired. Request a new one.",
    });
  if (!(await argon2.verify(challenge.codeHash, input.code))) {
    await database
      .update(authChallenges)
      .set({ attempts: challenge.attempts + 1 })
      .where(eq(authChallenges.id, challenge.id));
    throw createError({
      statusCode: 401,
      statusMessage: "Incorrect verification code.",
    });
  }
  await database
    .update(authChallenges)
    .set({ consumedAt: new Date() })
    .where(eq(authChallenges.id, challenge.id));
  const user = await database.query.users.findFirst({
    where: eq(users.id, challenge.userId),
  });
  const organization = await database.query.organizations.findFirst({
    where: eq(organizations.id, challenge.organizationId),
  });
  if (!user || !organization)
    throw createError({
      statusCode: 401,
      statusMessage: "Account is no longer available.",
    });
  createSession(event, user.id, organization.id);
  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    },
    organization,
  };
});
