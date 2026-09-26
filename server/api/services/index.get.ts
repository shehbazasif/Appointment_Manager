import { requireTenant } from "../../utils/auth";
import { getUserClient } from "../../utils/supabase";

const serializeService = (s: any) => ({
  id: s.id,
  businessId: s.business_id,
  name: s.name,
  description: s.description ?? null,
  category: s.category ?? "General",
  durationMinutes: s.duration_minutes,
  priceCents: s.price != null ? Math.round(Number(s.price) * 100) : 0,
  currency: s.currency ?? "EUR",
  active: s.status === "ACTIVE",
  accent: s.accent ?? "#ca7481",
  createdAt: s.created_at,
  updatedAt: s.updated_at,
});

export default defineEventHandler(async (event) => {
  const { businessId } = await requireTenant(event);
  const sb = await getUserClient(event);

  const { data, error } = await sb
    .from("services")
    .select("*")
    .eq("business_id", businessId)
    .order("name", { ascending: true });

  if (error) throw createError({ statusCode: 500, statusMessage: error.message });
  return (data ?? []).map(serializeService);
});
