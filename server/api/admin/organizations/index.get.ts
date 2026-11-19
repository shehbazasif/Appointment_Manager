import { getQuery } from "h3";
import { requireSuperAdmin } from "../../../utils/auth";
import { getUserClient } from "../../../utils/supabase";

// Every business on the platform (admin only — enforced again in the database).
export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event);
  const sb = await getUserClient(event);
  const search = String(getQuery(event).search ?? "").slice(0, 100).trim();
  const { data, error } = await sb.rpc("admin_list_businesses", { p_search: search || null });
  if (error) throw createError({ statusCode: error.code === "42501" ? 403 : 500, statusMessage: error.message });
  return data ?? [];
});
