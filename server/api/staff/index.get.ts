import { requireTenant } from "../../utils/auth";
import { getUserClient } from "../../utils/supabase";

const serializeStaff = (m: any, serviceIds: string[] = [], shared = false) => ({
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
  /** head-office staff shown in a branch: can be assigned, not edited here */
  shared,
  createdAt: m.created_at,
  updatedAt: m.updated_at,
});

export default defineEventHandler(async (event) => {
  const { businessId, business } = await requireTenant(event);
  const headId = (business as any).parent_business_id as string | null;
  const sb = await getUserClient(event);

  const { data: staffRows, error } = await sb
    .from("staff")
    .select("*")
    .in("business_id", headId ? [businessId, headId] : [businessId])
    .order("created_at", { ascending: true });

  if (error) throw createError({ statusCode: 500, statusMessage: error.message });

  const { data: allStaffServices } = await sb
    .from("staff_services")
    .select("staff_id, service_id")
    .eq("business_id", businessId);
  // in a branch, a head-office driver can do every service of the branch
  const { data: branchServices } = headId
    ? await sb.from("services").select("id").eq("business_id", businessId)
    : { data: [] as { id: string }[] };

  const servicesByStaff = new Map<string, string[]>();
  for (const ss of allStaffServices ?? []) {
    const list = servicesByStaff.get(ss.staff_id) ?? [];
    list.push(ss.service_id);
    servicesByStaff.set(ss.staff_id, list);
  }

  return (staffRows ?? []).map((member: any) => {
    const shared = member.business_id !== businessId;
    return serializeStaff(
      member,
      shared ? (branchServices ?? []).map((s: any) => s.id) : (servicesByStaff.get(member.id) ?? []),
      shared,
    );
  });
});
