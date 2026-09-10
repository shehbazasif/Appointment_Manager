import { and, eq } from "drizzle-orm";
import { memberships, organizations, users } from "../db/schema";
import { requireDatabase } from "../utils/database";
import { requireSession } from "../utils/session";

export default defineEventHandler(async (event) => {
  const session = requireSession(event);
  const database = requireDatabase();
  const result = await database
    .select({
      user: users,
      organization: organizations,
      role: memberships.role,
    })
    .from(memberships)
    .innerJoin(users, eq(memberships.userId, users.id))
    .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
    .where(
      and(
        eq(memberships.userId, session.userId),
        eq(memberships.organizationId, session.organizationId),
      ),
    );
  const membership = result[0];
  if (!membership || membership.user.id !== session.userId)
    throw createError({
      statusCode: 401,
      statusMessage: "Session is no longer valid.",
    });
  return {
    user: {
      id: membership.user.id,
      email: membership.user.email,
      firstName: membership.user.firstName,
      lastName: membership.user.lastName,
    },
    organization: membership.organization,
    role: membership.role,
  };
});
