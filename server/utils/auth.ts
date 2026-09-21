import type { H3Event } from "h3";
import { serverSupabaseUser } from "#supabase/server";
import { getSupabaseAdmin } from "./supabase";

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
  role: string;
  organization: Record<string, unknown>;
};

const findMembership = async (userId: string) => {
  try {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("memberships")
      .select("*, organization:organizations(*)")
      .eq("user_id", userId)
      .eq("status", "ACTIVE")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.warn("findMembership query error:", error.message);
      return null;
    }
    return data;
  } catch (err: any) {
    console.warn("findMembership exception:", err?.message);
    return null;
  }
};

const toTenantContext = (
  authUser: AuthUser,
  membership: NonNullable<Awaited<ReturnType<typeof findMembership>>>,
): TenantContext => ({
  ...authUser,
  userId: membership.user_id,
  organizationId: membership.organization_id,
  role: membership.role,
  organization: membership.organization as Record<string, unknown>,
});

/**
 * Resolves the authenticated Supabase user from the session cookies set by
 * the @nuxtjs/supabase module. The JWT is verified before the request continues.
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

/**
 * Ensures the authenticated user has platform super-admin privileges.
 */
export const requireSuperAdmin = async (event: H3Event) => {
  const authUser = await requireAuthUser(event);
  const claims = (await serverSupabaseUser(event)) as SupabaseClaims | null;
  const isPlatformAdmin =
    claims?.app_metadata?.platform_role === "SUPER_ADMIN" ||
    claims?.app_metadata?.role === "SUPER_ADMIN" ||
    claims?.user_metadata?.role === "SUPER_ADMIN";

  if (isPlatformAdmin) return authUser;

  const sb = getSupabaseAdmin();
  const { data: adminMembership } = await sb
    .from("memberships")
    .select("role")
    .eq("user_id", authUser.id)
    .single();

  if (adminMembership?.role === "SUPER_ADMIN") {
    return authUser;
  }

  throw createError({
    statusCode: 403,
    statusMessage: "Access restricted to platform administrators.",
  });
};
