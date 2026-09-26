import { readValidatedBody } from "h3";
import { organizationSettingsSchema } from "#shared/schemas/business";
import { requireTenant, serializeBusiness } from "../../utils/auth";
import { getUserClient } from "../../utils/supabase";

const mapSettingsToColumns = (input: Record<string, unknown>) => {
  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.slug !== undefined) updates.slug = String(input.slug).toLowerCase();
  if (input.description !== undefined) updates.description = input.description;
  if (input.logoUrl !== undefined) updates.logo_url = input.logoUrl;
  if (input.email !== undefined) updates.email = input.email;
  if (input.phone !== undefined) updates.phone = input.phone;
  if (input.address !== undefined) updates.address = input.address;
  if (input.city !== undefined) updates.city = input.city;
  if (input.country !== undefined) updates.country = input.country;
  if (input.timezone !== undefined) updates.timezone = input.timezone;
  if (input.currency !== undefined) updates.currency = input.currency;
  // bookingActive is NOT mapped here — it lives in business_settings.online_booking_enabled
  // and is handled asynchronously in the handler below.
  return updates;
};

export default defineEventHandler(async (event) => {
  const { businessId, settings } = await requireTenant(event);
  const input = await readValidatedBody(event, organizationSettingsSchema.parse);
  const sb = await getUserClient(event);

  const updates = mapSettingsToColumns(input);
  const hasBusinessUpdates = Object.keys(updates).length > 0;
  const hasSettingsUpdates = input.bookingActive !== undefined;

  if (!hasBusinessUpdates && !hasSettingsUpdates)
    throw createError({ statusCode: 400, statusMessage: "No fields to update." });

  // Booking on/off toggle → business_settings.online_booking_enabled
  if (hasSettingsUpdates) {
    const { error: settingsError } = await sb
      .from("business_settings")
      .upsert(
        {
          business_id: businessId,
          online_booking_enabled: input.bookingActive,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "business_id" },
      );
    if (settingsError)
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to update booking toggle: ${settingsError.message}`,
      });
  }

  if (!hasBusinessUpdates) {
    // Only the toggle changed — return current business + fresh settings
    const { data: business } = await sb
      .from("businesses")
      .select("*")
      .eq("id", businessId)
      .single();
    const { data: freshSettings } = await sb
      .from("business_settings")
      .select("*")
      .eq("business_id", businessId)
      .maybeSingle();
    if (!business)
      throw createError({ statusCode: 404, statusMessage: "Business profile not found." });
    return serializeBusiness(business, freshSettings);
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

  const { data: freshSettings } = await sb
    .from("business_settings")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();

  return serializeBusiness(updated, freshSettings ?? settings);
});
