import { randomUUID } from "node:crypto";
import { readValidatedBody } from "h3";
import { z } from "zod";
import { requireHeadOffice } from "../../utils/auth";
import { getUserClient } from "../../utils/supabase";

const bodySchema = z.object({
  name: z.string().trim().min(2, "Enter the branch name.").max(120),
  city: z.string().trim().max(80).optional(),
});

const toSlug = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

/**
 * Head office only: add a branch. The branch starts with the head office's
 * services, working hours and settings (online booking off), so it is ready
 * to take appointments straight away.
 */
export default defineEventHandler(async (event) => {
  const { homeBusiness, settings: headSettings } = await requireHeadOffice(event);
  const { name, city } = await readValidatedBody(event, bodySchema.parse);
  const sb = await getUserClient(event);
  const head = homeBusiness as any;

  // The id is made here: the database only lets the head office "see" the
  // branch after the row exists, so it cannot be read back in the same step.
  const id = randomUUID();
  const base = `${toSlug(head.slug || head.name || "branch")}-${toSlug(name) || "branch"}`.slice(0, 70);
  let created = false;
  let lastError = "";
  for (let attempt = 0; attempt < 5 && !created; attempt++) {
    const slug = attempt === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const { error } = await sb.from("businesses").insert({
      id,
      name,
      slug,
      email: head.email,
      phone: head.phone ?? null,
      logo_url: head.logo_url ?? null,
      description: head.description ?? null,
      address: null,
      city: city || head.city || null,
      country: head.country ?? null,
      timezone: head.timezone ?? null,
      currency: head.currency ?? null,
      status: "ACTIVE",
      parent_business_id: head.id,
    });
    if (!error) created = true;
    else {
      lastError = error.message;
      if (!/duplicate|unique/i.test(error.message)) break;
    }
  }
  if (!created) throw createError({ statusCode: 400, statusMessage: lastError || "Could not add the branch." });

  // settings: same as the head office, but no public online booking
  const s: any = headSettings ?? {};
  await sb.from("business_settings").insert({
    business_id: id,
    timezone: s.timezone ?? head.timezone ?? null,
    currency: s.currency ?? head.currency ?? null,
    language: s.language ?? "en",
    online_booking_enabled: false,
    on_location_enabled: s.on_location_enabled ?? false,
    hide_prices_in_list: s.hide_prices_in_list ?? false,
    tokens_enabled: s.tokens_enabled ?? true,
    show_token_to_customer: s.show_token_to_customer ?? false,
    business_type: s.business_type ?? "general",
    slot_step_minutes: s.slot_step_minutes ?? 30,
    buffer_minutes: s.buffer_minutes ?? 0,
    theme_color: s.theme_color ?? null,
    service_categories: s.service_categories ?? null,
  });

  // services and working hours: copied from the head office
  const [{ data: services }, { data: hours }] = await Promise.all([
    sb.from("services").select("name, description, duration_minutes, price, currency, status, category").eq("business_id", head.id),
    sb.from("business_hours").select("day_of_week, start_time, end_time, is_closed").eq("business_id", head.id),
  ]);
  if (services?.length) await sb.from("services").insert(services.map((x: any) => ({ ...x, business_id: id })));
  if (hours?.length) await sb.from("business_hours").insert(hours.map((x: any) => ({ ...x, business_id: id })));

  return { id, name };
});
