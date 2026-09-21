import { readValidatedBody, setResponseStatus } from "h3";
import { bootstrapSchema } from "#shared/schemas/auth";
import { requireAuthUser } from "../../utils/auth";
import { getSupabaseAdmin } from "../../utils/supabase";

const metadataString = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

/**
 * Idempotent tenant provisioning for a freshly registered Supabase user.
 * Creates the tenant `users` row (id = Supabase auth uid), the organization
 * and the OWNER membership. Safe to call multiple times.
 */
export default defineEventHandler(async (event) => {
  const authUser = await requireAuthUser(event);
  const body = await readValidatedBody(event, (raw) =>
    bootstrapSchema.parse(raw && typeof raw === "object" ? raw : {}),
  );

  const metadata = authUser.userMetadata;
  const firstName =
    body.firstName ?? metadataString(metadata.first_name) ?? "";
  const lastName = body.lastName ?? metadataString(metadata.last_name) ?? "";
  const businessName =
    body.businessName ??
    metadataString(metadata.pending_business_name) ??
    metadataString(metadata.business_name);
  const businessSlug =
    body.businessSlug ??
    metadataString(metadata.pending_business_slug) ??
    metadataString(metadata.business_slug);

  const sb = getSupabaseAdmin();

  // Check if membership already exists
  const { data: existingMembership } = await sb
    .from("memberships")
    .select("*, organization:organizations(*)")
    .eq("user_id", authUser.id)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (existingMembership)
    return {
      created: false,
      user: { id: authUser.id, email: authUser.email },
      organization: existingMembership.organization,
    };

  if (!businessName || !businessSlug)
    throw createError({
      statusCode: 422,
      statusMessage:
        "Business name and slug are required to create your workspace.",
      data: { code: "MISSING_BUSINESS_DETAILS" },
    });

  // Check slug uniqueness
  const { data: slugConflict } = await sb
    .from("organizations")
    .select("id")
    .eq("slug", businessSlug)
    .maybeSingle();

  if (slugConflict)
    throw createError({
      statusCode: 409,
      statusMessage: "This booking slug is already in use.",
    });

  // Upsert user row (mirrors Supabase auth uid into tenant users table)
  await sb.from("users").upsert(
    {
      id: authUser.id,
      email: authUser.email,
      password_hash: "supabase-managed",
      first_name: firstName || "Business",
      last_name: lastName || "Owner",
      status: "ACTIVE",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  // Create organization
  const { data: organization, error: orgError } = await sb
    .from("organizations")
    .insert({
      name: businessName,
      slug: businessSlug,
      email: authUser.email,
      booking_active: false,
    })
    .select()
    .single();

  if (orgError)
    throw createError({ statusCode: 500, statusMessage: orgError.message });

  // Create OWNER membership
  await sb.from("memberships").upsert(
    {
      organization_id: organization.id,
      user_id: authUser.id,
      role: "OWNER",
      status: "ACTIVE",
    },
    { onConflict: "organization_id,user_id" }
  );

  setResponseStatus(event, 201);
  return {
    created: true,
    user: { id: authUser.id, email: authUser.email },
    organization,
  };
});
