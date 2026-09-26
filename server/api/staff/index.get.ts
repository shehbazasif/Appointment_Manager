import { requireTenant } from "../../utils/auth";
import { getUserClient } from "../../utils/supabase";

const serializeStaff = (m: any, serviceIds: string[] = []) => ({
  id: m.id,
  businessId: m.business_id,
  userId: m.user_id ?? null,
  name: [m.first_name, m.last_name].filter(Boolean).join(" ") || m.email || "Staff",
  firstName: m.first_name ?? "",
  lastName: m.last_name ?? "",
  email: m.email ?? null,
  phone: m.phone ?? null,
  role: m.job_title ?? "Staff",
  active: m.status === "ACTIVE",
  status: m.status ?? "ACTIVE",
  serviceIds,
  createdAt: m.created_at,
  updatedAt: m.updated_at,
});

export default defineEventHandler(async (event) => {
  const { businessId } = await requireTenant(event);
  const sb = await getUserClient(event);

  const { data: staffRows, error } = await sb
    .from("staff")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: true });

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

  return (staffRows ?? []).map((member: any) =>
    serializeStaff(member, servicesByStaff.get(member.id) ?? []),
  );
});
