import { readValidatedBody, setResponseStatus } from "h3";
import { z } from "zod";
import { requireSuperAdmin, serializeBusiness } from "../../../utils/auth";
import { getUserClient } from "../../../utils/supabase";

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
  const sb = await getUserClient(event);

  const { data: business, error } = await sb
    .from("businesses")
    .insert({
      name: input.name,
      slug: input.slug.toLowerCase(),
      email: input.email.toLowerCase(),
      phone: input.phone ?? null,
      city: input.city ?? "Athens",
      country: input.country ?? "Greece",
      description: input.description ?? null,
      status: "ACTIVE",
    })
    .select()
    .single();

  if (error) throw createError({ statusCode: 500, statusMessage: error.message });

  await sb
    .from("business_settings")
    .upsert(
      { business_id: business.id, currency: "EUR", timezone: "Europe/Athens", online_booking_enabled: input.bookingActive },
      { onConflict: "business_id" },
    );

  setResponseStatus(event, 201);
  return serializeBusiness(business, { online_booking_enabled: input.bookingActive });
});
