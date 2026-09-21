import { requireTenant } from "../../utils/auth";
import { getSupabaseAdmin } from "../../utils/supabase";

export default defineEventHandler(async (event) => {
  const { organizationId } = await requireTenant(event);
  const sb = getSupabaseAdmin();

  const { data: staffRows, error } = await sb
    .from("staff")
    .select("*")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true });

  if (error) throw createError({ statusCode: 500, statusMessage: error.message });

  const { data: allStaffServices } = await sb
    .from("staff_services")
    .select("staff_id, service_id");

  const servicesByStaff = new Map<string, string[]>();
  for (const ss of allStaffServices ?? []) {
    const list = servicesByStaff.get(ss.staff_id) ?? [];
    list.push(ss.service_id);
    servicesByStaff.set(ss.staff_id, list);
  }

  return (staffRows ?? []).map((member: any) => ({
    ...member,
    serviceIds: servicesByStaff.get(member.id) ?? [],
  }));
});
