import { requireSuperAdmin } from "../../../utils/auth";
import { getUserClient } from "../../../utils/supabase";

// One business: settings, feature access, members, counts, recent bookings.
export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event);
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "Organization ID is required." });
  const sb = await getUserClient(event);
  const { data, error } = await sb.rpc("admin_business_detail", { p_business_id: id });
  if (error)
    throw createError({
      statusCode: error.code === "42501" ? 403 : error.code === "P0002" ? 404 : 500,
      statusMessage: error.message,
    });
  return data;
});
