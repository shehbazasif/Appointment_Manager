import { requireSuperAdmin } from "../../utils/auth";
import { getUserClient } from "../../utils/supabase";

// Platform-wide numbers. The database function itself refuses non-admins.
export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event);
  const sb = await getUserClient(event);
  const { data, error } = await sb.rpc("admin_stats");
  if (error) throw createError({ statusCode: error.code === "42501" ? 403 : 500, statusMessage: error.message });
  return { ...(data as Record<string, number>), timestamp: new Date().toISOString() };
});
