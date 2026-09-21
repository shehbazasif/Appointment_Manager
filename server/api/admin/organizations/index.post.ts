import { readValidatedBody, setResponseStatus } from "h3";
import { z } from "zod";
import { requireSuperAdmin } from "../../../utils/auth";
import { getSupabaseAdmin } from "../../../utils/supabase";

const createOrgSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/i),
  email: z.string().email(),
  phone: z.string().optional(),
  city: z.string().optional().default("Athens"),
  country: z.string().optional().default("Greece"),
  description: z.string().optional(),
  bookingActive: z.boolean().default(true),
});

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event);
  const input = await readValidatedBody(event, createOrgSchema.parse);
  const sb = getSupabaseAdmin();

  const { data: org, error } = await sb
    .from("organizations")
    .insert({
      name: input.name,
      slug: input.slug.toLowerCase(),
      email: input.email.toLowerCase(),
      phone: input.phone ?? null,
      city: input.city ?? "Athens",
      country: input.country ?? "Greece",
      description: input.description ?? null,
      booking_active: input.bookingActive,
    })
    .select()
    .single();

  if (error) throw createError({ statusCode: 500, statusMessage: error.message });
  setResponseStatus(event, 201);
  return org;
});
