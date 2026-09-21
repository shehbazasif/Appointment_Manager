import { readValidatedBody } from "h3";
import { z } from "zod";
import { requireSuperAdmin } from "../../../utils/auth";
import { getSupabaseAdmin } from "../../../utils/supabase";

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
  const sb = getSupabaseAdmin();

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.status !== undefined) updateData.status = input.status;
  if (input.bookingActive !== undefined) updateData.booking_active = input.bookingActive;
  if (input.name !== undefined) updateData.name = input.name;
  if (input.slug !== undefined) updateData.slug = input.slug;

  const { data: updated, error } = await sb
    .from("organizations")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error || !updated)
    throw createError({ statusCode: 404, statusMessage: "Organization not found." });

  return updated;
});
