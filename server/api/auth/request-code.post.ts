import argon2 from "argon2";
import { eq } from "drizzle-orm";
import { readValidatedBody } from "h3";
import { requestCodeSchema } from "#shared/schemas/auth-code";
import { authChallenges, memberships, users } from "../../db/schema";
import { requireDatabase } from "../../utils/database";

export default defineEventHandler(async (event) => {
  const input = await readValidatedBody(event, requestCodeSchema.parse);
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
  });
  if (!membership)
    throw createError({
      statusCode: 403,
      statusMessage: "No active business membership found.",
    });
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const [challenge] = await database
    .insert(authChallenges)
    .values({
      userId: user.id,
      organizationId: membership.organizationId,
      codeHash: await argon2.hash(code),
      expiresAt: new Date(Date.now() + 60_000),
    })
    .returning({ id: authChallenges.id, expiresAt: authChallenges.expiresAt });
  console.info(`[auth] Email code generated for ${user.email}`);
  return {
    challengeId: challenge.id,
    expiresAt: challenge.expiresAt,
    previewCode: process.env.NODE_ENV === "production" ? undefined : code,
  };
});
