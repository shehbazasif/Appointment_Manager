import type { H3Event } from "h3";
import { getHeader } from "h3";
import { serverSupabaseUser } from "#supabase/server";
import { getBearerToken, getUserClient } from "./supabase";
import { appSupportsLoginCode, isDeviceTrusted, trustDevice } from "./deviceTrust";

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
  /** The business the person is a member of (head office or a branch). */
  homeBusiness: Record<string, unknown> & { id: string };
  /** True when a head-office member is working inside one of its branches. */
  viewingBranch: boolean;
  /** Every business this person is a member of (for the business switcher). */
  memberships: { id: string; name: string; role: string; isBranch: boolean }[];
};

/**
 * Head-office members can work inside a branch: the app sends the branch id
 * in this header. It is only honoured when that business really is a branch
 * of the member's own business (the database enforces the same rule).
 */
export const BRANCH_HEADER = "x-branch-id";
/**
 * One account can belong to several businesses (its own, and e.g. a branch
 * of another company it was invited to). The app sends the chosen one in
 * this header; it is only used when the person really is a member of it.
 */
export const BUSINESS_HEADER = "x-business-id";

const findMembership = async (event: H3Event, userId: string, opts: { ignoreBranch?: boolean } = {}) => {
  try {
    const sb = await getUserClient(event);
    const { data: rows, error } = await sb
      .from("business_members")
      .select("*, business:businesses(*)")
      .eq("user_id", userId)
      .eq("status", "ACTIVE")
      .order("created_at", { ascending: false });
    if (error) {
      console.warn("findMembership query error:", error.message);
      return null;
    }
    if (!rows?.length) return null;
    // the business chosen in the app (only one of the person's own), else the newest
    const chosen = String(getHeader(event, BUSINESS_HEADER) ?? "").trim();
    const data = (rows as any[]).find((r) => r.business_id === chosen && r.business) ?? (rows as any[]).find((r) => r.business) ?? rows[0]!;
    const memberships = (rows as any[])
      .filter((r) => r.business)
      .map((r) => ({
        id: r.business_id as string,
        name: String(r.business?.name ?? ""),
        role: String(r.role ?? "").toUpperCase(),
        isBranch: !!r.business?.parent_business_id,
      }));
    const home = data.business;
    let business = home;
    let viewingBranch = false;
    const wanted = opts.ignoreBranch ? "" : String(getHeader(event, BRANCH_HEADER) ?? "").trim();
    if (wanted && wanted !== data.business_id && /^[0-9a-f-]{36}$/i.test(wanted)) {
      const { data: homeSettings } = await sb
        .from("business_settings")
        .select("features_allowed")
        .eq("business_id", data.business_id)
        .maybeSingle();
      const { data: branch } = !featureAllowed(homeSettings, "branches")
        ? { data: null }
        : await sb
        .from("businesses")
        .select("*")
        .eq("id", wanted)
        .eq("parent_business_id", data.business_id)
        .maybeSingle();
      if (branch) {
        business = branch;
        viewingBranch = true;
      }
    }
    // Booking on/off lives in business_settings.online_booking_enabled, not on businesses
    const { data: settings } = await sb
      .from("business_settings")
      .select("*")
      .eq("business_id", business.id)
      .maybeSingle();
    return { ...data, business_id: business.id, business, home, viewingBranch, memberships, settings: settings ?? null };
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
  homeBusiness: ((membership as any).home ?? membership.business ?? {}) as TenantContext["business"],
  viewingBranch: !!(membership as any).viewingBranch,
  memberships: (membership as any).memberships ?? [],
});

/**
 * The person's own business must be a head office (not a branch). Used by the
 * head-office screens (branch list, branch overview, add branch).
 */
export const requireHeadOffice = async (event: H3Event) => {
  const authUser = await requireAuthUser(event);
  requireTrustedDevice(event, authUser.id);
  const membership = await findMembership(event, authUser.id, { ignoreBranch: true });
  if (!membership?.business_id)
    throw createError({ statusCode: 403, statusMessage: "No active business found for this account." });
  if ((membership.business as any)?.parent_business_id)
    throw createError({ statusCode: 403, statusMessage: "Only the head office can do this." });
  if (!featureAllowed((membership as any).settings, "branches"))
    throw createError({ statusCode: 403, statusMessage: "Branches are not switched on for this business." });
  return toTenantContext(authUser, membership);
};

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
  requireTrustedDevice(event, authUser.id);
  const membership = await findMembership(event, authUser.id);
  if (!membership || !membership.business_id)
    throw createError({
      statusCode: 403,
      statusMessage: "No active business found for this account.",
      data: { code: "NO_BUSINESS" },
    });
  return toTenantContext(authUser, membership);
};

/**
 * 2-step login for business users on the website: this browser must have
 * confirmed an emailed code within the last 2 days of activity (see
 * deviceTrust.ts). Each request keeps the trust alive. The Android app
 * (Bearer token) is checked too once its build supports the code screen
 * (it sends x-app-login-code: 1); older installed versions are not.
 */
const codeCheckApplies = (event: H3Event) => !getBearerToken(event) || appSupportsLoginCode(event);

export const loginCodeRequired = (event: H3Event, userId: string) =>
  codeCheckApplies(event) && !isDeviceTrusted(event, userId);

export const requireTrustedDevice = (event: H3Event, userId: string) => {
  if (!codeCheckApplies(event)) return;
  if (!isDeviceTrusted(event, userId))
    throw createError({
      statusCode: 403,
      statusMessage: "Please confirm the code we emailed you.",
      data: { code: "LOGIN_CODE_REQUIRED" },
    });
  trustDevice(event, userId);
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

/** Features the platform admin can switch off per business (missing = allowed). */
export const FEATURE_KEYS = ["tokens", "onLocation", "attendance", "import", "theme", "branches"] as const;
export type FeatureKey = (typeof FEATURE_KEYS)[number];
/** Features that stay off until the platform admin switches them on. */
const OFF_BY_DEFAULT: readonly FeatureKey[] = ["branches"];
export const featureAllowed = (settings: Record<string, any> | null | undefined, key: FeatureKey) => {
  const v = (settings?.features_allowed ?? {})[key];
  return OFF_BY_DEFAULT.includes(key) ? v === true : v !== false;
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
  /** A branch follows its head office: profile, type and booking switches are locked. */
  isBranch: !!b.parent_business_id,
  bookingActive: settings?.online_booking_enabled ?? false,
  // features the platform admin turned off are off, whatever the owner chose
  onLocationEnabled: featureAllowed(settings, "onLocation") && (settings?.on_location_enabled ?? false),
  hidePricesInList: settings?.hide_prices_in_list ?? false,
  showTokenToCustomer: settings?.show_token_to_customer ?? false,
  slotStepMinutes: settings?.slot_step_minutes ?? 30,
  bufferMinutes: settings?.buffer_minutes ?? 0,
  language: settings?.language ?? "en",
  themeColor: featureAllowed(settings, "theme") ? (settings?.theme_color ?? null) : null,
  businessType: settings?.business_type ?? "general",
  tokensEnabled: settings?.tokens_enabled ?? true,
  allowedFeatures: settings?.features_allowed ?? {},
  /** What this business can actually use right now (admin access + owner switch). */
  features: {
    tokens: featureAllowed(settings, "tokens") && (settings?.tokens_enabled ?? true),
    onLocation: featureAllowed(settings, "onLocation") && (settings?.on_location_enabled ?? false),
    attendance: featureAllowed(settings, "attendance"),
    import: featureAllowed(settings, "import"),
    theme: featureAllowed(settings, "theme"),
    branches: featureAllowed(settings, "branches"),
  },
  // Name-change security limiter (2 free changes, then a 14-day cooldown)
  nameChangeCount: b.name_change_count ?? 0,
  nameChangedAt: b.name_changed_at ?? null,
  nameCooldownUntil: b.name_cooldown_until ?? null,
  createdAt: b.created_at,
  updatedAt: b.updated_at,
});
