import { readValidatedBody } from "h3";
import { onboardingSchema } from "#shared/schemas/auth";
import { getTenantContext, requireAuthUser } from "../utils/auth";
import { getUserClient } from "../utils/supabase";

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
 * Saves the business profile from onboarding. If the user has no business yet,
 * provisions one (profiles + businesses + OWNER membership + settings), then
 * applies the profile fields. Returns the serialized business.
 */
export default defineEventHandler(async (event) => {
  const authUser = await requireAuthUser(event);
  const input = await readValidatedBody(event, onboardingSchema.parse);
  const sb = await getUserClient(event);

  let tenant = await getTenantContext(event);
  let businessId = tenant?.businessId ?? null;

  // Provision a business if the user does not have one yet
  if (!businessId) {
    const metadata = authUser.userMetadata ?? {};
    const businessName =
      input.businessName ?? input.name ?? metadataString(metadata.pending_business_name) ?? "My Business";
    let slug =
      input.businessSlug ??
      metadataString(metadata.pending_business_slug) ??
      toSlug(businessName);
    if (!slug || slug.length < 3) slug = `business-${authUser.id.slice(0, 8)}`;

    const { data: slugConflict } = await sb
      .from("businesses")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (slugConflict) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

    const firstName = metadataString(metadata.first_name) ?? "Business";
    const lastName = metadataString(metadata.last_name) ?? "Owner";
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

    const { data: business, error: businessError } = await sb
      .from("businesses")
      .insert({
        name: businessName,
        slug,
        email: authUser.email,
        business_type: input.businessType ?? null,
        monthly_revenue: input.monthlyRevenue ?? null,
        description: input.description ?? null,
        phone: input.phone ?? null,
        city: input.city ?? null,
        status: "ACTIVE",
      })
      .select()
      .single();

    if (businessError || !business)
      throw createError({
        statusCode: 500,
        statusMessage: businessError?.message ?? "Failed to create business.",
      });

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

    const { data: createdSettings } = await sb
      .from("business_settings")
      .upsert(
        { business_id: business.id, currency: "EUR", timezone: "Europe/Athens", online_booking_enabled: true },
        { onConflict: "business_id" },
      )
      .select()
      .maybeSingle();

    return serializeCreated(event, business, createdSettings);
  }

  // Business exists: update profile fields on the businesses row
  // (booking toggle intentionally not touched here — lives in business_settings)
  if (input.name) updates.name = input.name;
  if (input.businessName) updates.name = input.businessName;
  if (input.businessType !== undefined) updates.business_type = input.businessType;
  if (input.monthlyRevenue !== undefined) updates.monthly_revenue = input.monthlyRevenue;
  if (input.description !== undefined) updates.description = input.description;
  if (input.phone !== undefined) updates.phone = input.phone;
  if (input.city !== undefined) updates.city = input.city;

  if (Object.keys(updates).length === 0) {
    const { data: existing } = await sb
      .from("businesses")
      .select("*")
      .eq("id", businessId)
      .single();
    const { data: currentSettings } = await sb
      .from("business_settings")
      .select("*")
      .eq("business_id", businessId)
      .maybeSingle();
    return serializeCreated(event, existing ?? {}, currentSettings);
  }

  const { data: updated, error } = await sb
    .from("businesses")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", businessId)
    .select()
    .single();

  if (error || !updated)
    throw createError({
      statusCode: 500,
      statusMessage: error?.message ?? "Failed to update business profile.",
    });

  const { data: updatedSettings } = await sb
    .from("business_settings")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();

  return serializeCreated(event, updated, updatedSettings);
});

// Local serializer to avoid importing page-facing types (same shape as utils/auth).
// bookingActive comes from business_settings.online_booking_enabled.
const serializeCreated = (_event: unknown, b: Record<string, any>, settings?: Record<string, any> | null) => ({
  id: b.id,
  name: b.name,
  slug: b.slug,
  description: b.description ?? null,
  businessType: b.business_type ?? null,
  monthlyRevenue: b.monthly_revenue ?? null,
  email: b.email ?? "",
  phone: b.phone ?? null,
  city: b.city ?? null,
  country: b.country ?? null,
  timezone: b.timezone ?? settings?.timezone ?? "Europe/Athens",
  currency: b.currency ?? settings?.currency ?? "EUR",
  status: b.status ?? "ACTIVE",
  bookingActive: settings?.online_booking_enabled ?? false,
  createdAt: b.created_at,
  updatedAt: b.updated_at,
});
