import { readValidatedBody, setResponseStatus } from "h3";
import { bootstrapSchema } from "#shared/schemas/auth";
import { requireAuthUser } from "../../utils/auth";
import { getUserClient } from "../../utils/supabase";

const metadataString = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

const toSlug = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

/**
 * Idempotent tenant provisioning for a freshly registered Supabase user.
 * Creates the `profiles` row (id = Supabase auth uid), the `businesses` row
 * (slug derived from the business name), the OWNER row in `business_members`
 * and default `business_settings`. Safe to call multiple times.
 */
export default defineEventHandler(async (event) => {
  const authUser = await requireAuthUser(event);
  const body = await readValidatedBody(event, (raw) =>
    bootstrapSchema.parse(raw && typeof raw === "object" ? raw : {}),
  );

  const metadata = authUser.userMetadata;
  const firstName = metadataString(metadata.first_name) ?? body.firstName ?? "Business";
  const lastName = metadataString(metadata.last_name) ?? body.lastName ?? "Owner";
  const businessName =
    body.businessName ??
    metadataString(metadata.business_name) ??
    metadataString(metadata.pending_business_name);
  const businessSlug =
    body.businessSlug ??
    metadataString(metadata.business_slug) ??
    metadataString(metadata.pending_business_slug);

  const sb = await getUserClient(event);

  // Already has an active membership? Nothing to do.
  const { data: existingMembership } = await sb
    .from("business_members")
    .select("*, business:businesses(*)")
    .eq("user_id", authUser.id)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (existingMembership?.business_id)
    return {
      created: false,
      user: { id: authUser.id, email: authUser.email },
      business: existingMembership.business,
    };

  if (!businessName)
    throw createError({
      statusCode: 422,
      statusMessage: "Business name is required to create your workspace.",
      data: { code: "MISSING_BUSINESS_DETAILS" },
    });

  // The booking slug is derived dynamically from the business name
  // (e.g. "Maria Beauty Studio" -> /book/maria-beauty-studio) unless one
  // was explicitly provided.
  let slug = businessSlug ?? toSlug(businessName);
  // Guard: non-latin business names (e.g. Greek) can slug to an empty string
  if (!slug) slug = `studio-${Math.random().toString(36).slice(2, 8)}`;

  // Ensure unique slug
  const { data: slugConflict } = await sb
    .from("businesses")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (slugConflict) {
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  // Mirror auth user into profiles (id = auth.users.id)
  const { error: profileError } = await sb.from("profiles").upsert(
    {
      id: authUser.id,
      first_name: firstName,
      last_name: lastName,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (profileError)
    throw createError({
      statusCode: 500,
      statusMessage: `Profile sync failed: ${profileError.message}`,
    });

  // Create business
  const { data: business, error: businessError } = await sb
    .from("businesses")
    .insert({
      name: businessName,
      slug,
      email: authUser.email,
      status: "ACTIVE",
    })
    .select()
    .single();

  if (businessError)
    throw createError({
      statusCode: 500,
      statusMessage: businessError.message,
    });

  // OWNER membership
  const { error: memberError } = await sb.from("business_members").upsert(
    {
      business_id: business.id,
      user_id: authUser.id,
      role: "OWNER",
      status: "ACTIVE",
    },
    { onConflict: "business_id,user_id" },
  );
  if (memberError)
    throw createError({
      statusCode: 500,
      statusMessage: `Membership creation failed: ${memberError.message}`,
    });

  // Default business settings
  await sb.from("business_settings").upsert(
    { business_id: business.id, currency: "EUR", timezone: "Europe/Athens" },
    { onConflict: "business_id" },
  );

  setResponseStatus(event, 201);
  return {
    created: true,
    user: { id: authUser.id, email: authUser.email },
    business,
  };
});
