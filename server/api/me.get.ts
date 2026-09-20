import { getTenantContext, requireAuthUser } from "../utils/auth";

/**
 * Returns the authenticated Supabase user plus their tenant context.
 * `organization` is null when the user has not finished business onboarding.
 */
export default defineEventHandler(async (event) => {
  const authUser = await requireAuthUser(event);
  const tenant = await getTenantContext(event);
  const metadata = authUser.userMetadata;
  return {
    user: {
      id: authUser.id,
      email: authUser.email,
      firstName:
        typeof metadata.first_name === "string" ? metadata.first_name : "",
      lastName:
        typeof metadata.last_name === "string" ? metadata.last_name : "",
    },
    organization: tenant?.organization ?? null,
    role: tenant?.role ?? null,
  };
});
