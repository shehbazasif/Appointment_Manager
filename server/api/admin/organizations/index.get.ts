import { getQuery } from "h3";
import { requireSuperAdmin, serializeBusiness } from "../../../utils/auth";
import { getUserClient } from "../../../utils/supabase";

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event);
  const sb = await getUserClient(event);
  const search = String(getQuery(event).search ?? "").trim();

  let q = sb.from("businesses").select("*, settings:business_settings(online_booking_enabled)").order("created_at", { ascending: false });

  if (search) {
    q = q.or(
      `name.ilike.%${search}%,slug.ilike.%${search}%,email.ilike.%${search}%,city.ilike.%${search}%`,
    );
  }

  const { data, error } = await q;
  if (error) throw createError({ statusCode: 500, statusMessage: error.message });
  return (data ?? []).map((row: any) => serializeBusiness(row, row.settings?.[0] ?? null));
});
