import { eq } from "drizzle-orm";
import type { H3Event } from "h3";
import { serverSupabaseUser } from "#supabase/server";
import { memberships, organizations } from "../db/schema";
import { requireDatabase } from "./database";

type Membership = typeof memberships.$inferSelect;
type Organization = typeof organizations.$inferSelect;

type SupabaseClaims = {
  sub?: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
};

export type AuthUser = {
  id: string;
  email: string;
  userMetadata: Record<string, unknown>;
};

export type TenantContext = AuthUser & {
  userId: string;
  organizationId: string;
  role: Membership["role"];
  organization: Organization;
};

const findMembership = (userId: string) =>
  requireDatabase().query.memberships.findFirst({
    where: eq(memberships.userId, userId),
    with: { organization: true },
  });

const toTenantContext = (
  authUser: AuthUser,
  membership: NonNullable<Awaited<ReturnType<typeof findMembership>>>,
): TenantContext => ({
  ...authUser,
  userId: membership.userId,
  organizationId: membership.organizationId,
  role: membership.role,
  organization: membership.organization as Organization,
});

/**
 * Resolves the authenticated Supabase user from the session cookies set by
 * the @nuxtjs/supabase module. The JWT is verified (getClaims) before the
 * request continues.
 */
export const requireAuthUser = async (event: H3Event) => {
  const claims = (await serverSupabaseUser(event)) as SupabaseClaims | null;
  if (!claims?.sub)
    throw createError({
      statusCode: 401,
      statusMessage: "Authentication required.",
    });
  return {
    id: claims.sub,
    email: (claims.email ?? "").toLowerCase(),
    userMetadata: claims.user_metadata ?? {},
  } satisfies AuthUser;
};

/**
 * Resolves the tenant (organization) from the authenticated user's ACTIVE
 * membership. The organization id is never read from the client.
 */
export const requireTenant = async (event: H3Event) => {
  const authUser = await requireAuthUser(event);
  const membership = await findMembership(authUser.id);
  if (!membership || membership.status !== "ACTIVE")
    throw createError({
      statusCode: 403,
      statusMessage: "No active business found for this account.",
      data: { code: "NO_ORGANIZATION" },
    });
  return toTenantContext(authUser, membership);
};

/** Same as requireTenant but returns null instead of throwing. */
export const getTenantContext = async (event: H3Event) => {
  const authUser = await requireAuthUser(event);
  const membership = await findMembership(authUser.id);
  if (!membership || membership.status !== "ACTIVE") return null;
  return toTenantContext(authUser, membership);
};
