import { getQuery } from "h3";
import { requireSuperAdmin } from "../../../utils/auth";
import { getSupabaseAdmin } from "../../../utils/supabase";

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event);
  const sb = getSupabaseAdmin();
  const search = String(getQuery(event).search ?? "").trim();

  let q = sb
    .from("organizations")
    .select("*")
    .order("created_at", { ascending: false });

  if (search) {
    q = q.or(
      `name.ilike.%${search}%,slug.ilike.%${search}%,email.ilike.%${search}%,city.ilike.%${search}%`
    );
  }

  const { data, error } = await q;
  if (error) throw createError({ statusCode: 500, statusMessage: error.message });
  return data ?? [];
});
