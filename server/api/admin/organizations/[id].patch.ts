import { readValidatedBody } from "h3";
import { z } from "zod";
import { requireSuperAdmin } from "../../../utils/auth";
import { getUserClient } from "../../../utils/supabase";

const patchOrgSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  bookingActive: z.boolean().optional(),
  businessType: z.enum(["general", "clinic", "pet_grooming", "salon", "field_service"]).optional(),
  allowedFeatures: z
    .object({
      tokens: z.boolean(),
      onLocation: z.boolean(),
      attendance: z.boolean(),
      import: z.boolean(),
      theme: z.boolean(),
    })
    .partial()
    .optional(),
});

// Admin changes to a business (status, booking, type, which features it may use).
export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event);
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "Organization ID is required." });
  const input = await readValidatedBody(event, patchOrgSchema.parse);
  const sb = await getUserClient(event);
  const { data, error } = await sb.rpc("admin_update_business", { p_business_id: id, p_patch: input });
  if (error)
    throw createError({
      statusCode: error.code === "42501" ? 403 : error.code === "P0002" ? 404 : 500,
      statusMessage: error.message,
    });
  return data;
});
