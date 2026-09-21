import { requireSuperAdmin } from "../../utils/auth";
import { getSupabaseAdmin } from "../../utils/supabase";

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event);
  const sb = getSupabaseAdmin();

  const [
    { count: orgCount },
    { count: apptCount },
    { count: userCount },
    { count: custCount },
    { count: staffCount },
    { count: servCount },
  ] = await Promise.all([
    sb.from("organizations").select("id", { count: "exact", head: true }),
    sb.from("appointments").select("id", { count: "exact", head: true }),
    sb.from("users").select("id", { count: "exact", head: true }),
    sb.from("customers").select("id", { count: "exact", head: true }),
    sb.from("staff").select("id", { count: "exact", head: true }),
    sb.from("services").select("id", { count: "exact", head: true }),
  ]);

  return {
    totalOrganizations: orgCount ?? 0,
    totalAppointments: apptCount ?? 0,
    totalUsers: userCount ?? 0,
    totalCustomers: custCount ?? 0,
    totalStaff: staffCount ?? 0,
    totalServices: servCount ?? 0,
    systemStatus: "Healthy",
    timestamp: new Date().toISOString(),
  };
});
