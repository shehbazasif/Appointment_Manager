import { readValidatedBody } from "h3";
import { onboardingSchema } from "#shared/schemas/auth";
import { getTenantContext, requireAuthUser } from "../utils/auth";
import { getSupabaseAdmin } from "../utils/supabase";

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
 * Updates business profile fields for the authenticated tenant.
 * If the user does not have an active organization yet, it provisions one
 * from the provided business name or signup metadata, then applies the profile updates.
 */
export default defineEventHandler(async (event) => {
  const authUser = await requireAuthUser(event);
  const input = await readValidatedBody(event, onboardingSchema.parse);
  const sb = getSupabaseAdmin();

  let tenant = await getTenantContext(event);

  // If no active business found, attempt to provision one
  if (!tenant) {
    const metadata = authUser.userMetadata ?? {};
    const businessName =
      input.businessName ??
      input.name ??
      metadataString(metadata.pending_business_name) ??
      metadataString(metadata.business_name);

    if (!businessName) {
      throw createError({
        statusCode: 400,
        statusMessage:
          "Please enter your business name to complete workspace setup.",
      });
    }

    let businessSlug =
      input.businessSlug ??
      metadataString(metadata.pending_business_slug) ??
      metadataString(metadata.business_slug) ??
      toSlug(businessName);

    if (!businessSlug || businessSlug.length < 3) {
      businessSlug = `business-${authUser.id.slice(0, 8)}`;
    }

    // Ensure slug uniqueness
    const { data: slugConflict } = await sb
      .from("organizations")
      .select("id")
      .eq("slug", businessSlug)
      .maybeSingle();

    if (slugConflict) {
      businessSlug = `${businessSlug}-${Math.random().toString(36).slice(2, 6)}`;
    }

    // Mirror auth user to users table
    const firstName =
      metadataString(metadata.first_name) ?? "Business";
    const lastName =
      metadataString(metadata.last_name) ?? "Owner";

    await sb.from("users").upsert(
      {
        id: authUser.id,
        email: authUser.email,
        password_hash: "supabase-managed",
        first_name: firstName,
        last_name: lastName,
        status: "ACTIVE",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    // Create organization
    const { data: newOrg, error: orgError } = await sb
      .from("organizations")
      .insert({
        name: businessName,
        slug: businessSlug,
        email: authUser.email,
        description: input.description,
        phone: input.phone,
        city: input.city ?? "Athens",
        booking_active: false,
      })
      .select()
      .single();

    if (orgError || !newOrg) {
      throw createError({
        statusCode: 500,
        statusMessage: orgError?.message ?? "Failed to create organization.",
      });
    }

    // Create OWNER membership
    await sb.from("memberships").upsert(
      {
        organization_id: newOrg.id,
        user_id: authUser.id,
        role: "OWNER",
        status: "ACTIVE",
      },
      { onConflict: "organization_id,user_id" }
    );

    return newOrg;
  }

  // Active business exists: update profile fields
  const updates: Record<string, unknown> = {};
  if (input.name) updates.name = input.name;
  if (input.businessName) updates.name = input.businessName;
  if (input.description !== undefined) updates.description = input.description;
  if (input.phone !== undefined) updates.phone = input.phone;
  if (input.city !== undefined) updates.city = input.city;

  if (Object.keys(updates).length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "No profile fields to update.",
    });
  }

  const { data: organization, error } = await sb
    .from("organizations")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", tenant.organizationId)
    .select()
    .single();

  if (error || !organization) {
    throw createError({
      statusCode: 404,
      statusMessage: error?.message ?? "Organization not found.",
    });
  }

  return organization;
});
