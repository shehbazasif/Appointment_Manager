import { featureAllowed, getTenantContext, loginCodeRequired, requireAuthUser, serializeBusiness } from "../utils/auth";
import { trustDevice } from "../utils/deviceTrust";
import { getUserClient } from "../utils/supabase";

/**
 * Returns the authenticated Supabase user plus their tenant context.
 * `organization` is null when the user's workspace is still provisioning
 * (bootstrap runs automatically on signup and self-heals on the dashboard).
 * (Field name kept as `organization` for UI compatibility.)
 */
export default defineEventHandler(async (event) => {
  const authUser = await requireAuthUser(event);
  // 2-step login: nothing about the business until the emailed code is confirmed
  if (loginCodeRequired(event, authUser.id)) {
    return {
      user: { id: authUser.id, email: authUser.email, firstName: "", lastName: "" },
      organization: null,
      role: null,
      loginCodeRequired: true,
    };
  }
  trustDevice(event, authUser.id);
  const tenant = await getTenantContext(event);
  const metadata = authUser.userMetadata;

  // Prefer the profiles row for names when it exists
  let firstName =
    typeof metadata.first_name === "string" ? metadata.first_name : "";
  let lastName =
    typeof metadata.last_name === "string" ? metadata.last_name : "";

  try {
    const sb = await getUserClient(event);
    const { data: profile } = await sb
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", authUser.id)
      .maybeSingle();
    if (profile?.first_name) firstName = profile.first_name;
    if (profile?.last_name) lastName = profile.last_name;
  } catch {
    // Service key not configured — metadata fallback already set
  }

  return {
    user: { id: authUser.id, email: authUser.email, firstName, lastName },
    organization: tenant ? serializeBusiness(tenant.business, tenant.settings) : null,
    role: tenant?.role ?? null,
    // Branches: a head-office member can open its branches; a branch member cannot
    // (only when the platform admin switched branches on for this business)
    isHeadOffice: tenant
      ? !(tenant.homeBusiness as any).parent_business_id && (tenant.viewingBranch || featureAllowed(tenant.settings, "branches"))
      : false,
    viewingBranch: tenant?.viewingBranch ?? false,
    homeBusiness: tenant ? { id: tenant.homeBusiness.id, name: (tenant.homeBusiness as any).name } : null,
    // every business this account can open (business switcher)
    businesses: tenant?.memberships ?? [],
  };
});
