import { readValidatedBody } from "h3";
import { z } from "zod";
import { requireSuperAdmin, serializeBusiness } from "../../../utils/auth";
import { getUserClient } from "../../../utils/supabase";

const patchOrgSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  bookingActive: z.boolean().optional(),
  name: z.string().min(2).optional(),
  slug: z.string().min(2).optional(),
});

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event);
  const id = getRouterParam(event, "id");
  if (!id)
    throw createError({ statusCode: 400, statusMessage: "Organization ID is required." });

  const input = await readValidatedBody(event, patchOrgSchema.parse);
  const sb = await getUserClient(event);

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.status !== undefined) updateData.status = input.status;
  if (input.name !== undefined) updateData.name = input.name;
  if (input.slug !== undefined) updateData.slug = input.slug.toLowerCase();

  // Booking on/off lives in business_settings.online_booking_enabled
  if (input.bookingActive !== undefined) {
    const { error: settingsError } = await sb
      .from("business_settings")
      .upsert(
        { business_id: id, online_booking_enabled: input.bookingActive, updated_at: new Date().toISOString() },
        { onConflict: "business_id" },
      );
    if (settingsError)
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to update booking toggle: ${settingsError.message}`,
      });
  }

  const { data: updated, error } = await sb
    .from("businesses")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error || !updated)
    throw createError({ statusCode: 404, statusMessage: "Organization not found." });

  const { data: freshSettings } = await sb
    .from("business_settings")
    .select("*")
    .eq("business_id", id)
    .maybeSingle();

  return serializeBusiness(updated, freshSettings);
});
