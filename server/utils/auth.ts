import type { H3Event } from "h3";
import { serverSupabaseUser } from "#supabase/server";
import { getBearerToken, getUserClient } from "./supabase";

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
  businessId: string;
  role: string;
  business: Record<string, unknown> & { id: string };
  settings: Record<string, any> | null;
};

const findMembership = async (event: H3Event, userId: string) => {
  try {
    const sb = await getUserClient(event);
    const { data, error } = await sb
      .from("business_members")
      .select("*, business:businesses(*)")
      .eq("user_id", userId)
      .eq("status", "ACTIVE")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.warn("findMembership query error:", error.message);
      return null;
    }
    if (!data) return null;
    // Booking on/off lives in business_settings.online_booking_enabled, not on businesses
    const { data: settings } = await sb
      .from("business_settings")
      .select("*")
      .eq("business_id", data.business_id)
      .maybeSingle();
    return { ...data, settings: settings ?? null };
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
  businessId: membership.business_id,
  role: membership.role ?? "OWNER",
  business: (membership.business ?? {}) as TenantContext["business"],
  settings: (membership as any).settings ?? null,
});

/** Verified token claims: Bearer token (Android app) or session cookies (website). */
const getClaims = async (event: H3Event) => {
  const token = getBearerToken(event);
  if (!token) return (await serverSupabaseUser(event)) as SupabaseClaims | null;
  try {
    const sb = await getUserClient(event);
    const { data, error } = await sb.auth.getClaims(token);
    if (error) throw error;
    return (data?.claims ?? null) as SupabaseClaims | null;
  } catch {
    // Invalid/expired token (or Supabase unreachable) => not logged in.
    throw createError({
      statusCode: 401,
      statusMessage: "Authentication required.",
    });
  }
};

/**
 * Resolves the authenticated Supabase user from the session cookies set by
 * the @nuxtjs/supabase module. The JWT is verified before the request continues.
 */
export const requireAuthUser = async (event: H3Event) => {
  const claims = await getClaims(event);
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
 * Resolves the tenant (business) from the authenticated user's ACTIVE
 * membership in `business_members`. The business id is never read from the client.
 */
export const requireTenant = async (event: H3Event) => {
  const authUser = await requireAuthUser(event);
  const membership = await findMembership(event, authUser.id);
  if (!membership || !membership.business_id)
    throw createError({
      statusCode: 403,
      statusMessage: "No active business found for this account.",
      data: { code: "NO_BUSINESS" },
    });
  return toTenantContext(authUser, membership);
};

/** Same as requireTenant but returns null instead of throwing. */
export const getTenantContext = async (event: H3Event) => {
  const authUser = await requireAuthUser(event);
  const membership = await findMembership(event, authUser.id);
  if (!membership || !membership.business_id) return null;
  return toTenantContext(authUser, membership);
};

/**
 * Platform super-admin check. Under RLS a SUPER_ADMIN's powers come from
 * policies/membership rows, so the server only verifies the claim here.
 * Grant by setting app_metadata.platform_role = 'SUPER_ADMIN' on the user
 * (Supabase Dashboard → Auth → Users) or by an OWNER row in the platform
 * business — verified via the user-scoped membership query.
 */
export const requireSuperAdmin = async (event: H3Event) => {
  const authUser = await requireAuthUser(event);
  const claims = await getClaims(event);
  const isPlatformAdmin =
    claims?.app_metadata?.platform_role === "SUPER_ADMIN" ||
    claims?.app_metadata?.role === "SUPER_ADMIN" ||
    claims?.user_metadata?.role === "SUPER_ADMIN";

  if (isPlatformAdmin) return authUser;

  const sb = await getUserClient(event);
  const { data: adminRow } = await sb
    .from("business_members")
    .select("role")
    .eq("user_id", authUser.id)
    .eq("role", "SUPER_ADMIN")
    .maybeSingle();

  if (adminRow) return authUser;

  throw createError({
    statusCode: 403,
    statusMessage: "Access restricted to platform administrators.",
  });
};

/** Serializes a `businesses` row + optional `business_settings` row into the camelCase shape the UI expects. */
export const serializeBusiness = (
  b: Record<string, any>,
  settings?: Record<string, any> | null,
) => ({
  id: b.id,
  name: b.name,
  slug: b.slug,
  description: b.description ?? null,
  email: b.email ?? "",
  phone: b.phone ?? null,
  website: b.website ?? null,
  address: b.address ?? null,
  city: b.city ?? null,
  country: b.country ?? null,
  postcode: b.postcode ?? null,
  timezone: b.timezone ?? settings?.timezone ?? "Europe/Athens",
  currency: b.currency ?? settings?.currency ?? "EUR",
  // Cache-bust the logo on every save — storage objects are overwritten in place.
  logoUrl:
    b.logo_url
      ? `${b.logo_url}${b.logo_url.includes("?") ? "&" : "?"}v=${encodeURIComponent(String(b.updated_at ?? ""))}`
      : null,
  status: b.status ?? "ACTIVE",
  bookingActive: settings?.online_booking_enabled ?? false,
  // Name-change security limiter (2 free changes, then a 14-day cooldown)
  nameChangeCount: b.name_change_count ?? 0,
  nameChangedAt: b.name_changed_at ?? null,
  nameCooldownUntil: b.name_cooldown_until ?? null,
  createdAt: b.created_at,
  updatedAt: b.updated_at,
});
