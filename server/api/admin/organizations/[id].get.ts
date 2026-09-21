import { requireSuperAdmin } from "../../../utils/auth";
import { getSupabaseAdmin } from "../../../utils/supabase";

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event);
  const id = getRouterParam(event, "id");
  if (!id)
    throw createError({ statusCode: 400, statusMessage: "Organization ID is required." });

  const sb = getSupabaseAdmin();
  const { data: organization } = await sb
    .from("organizations")
    .select("*")
    .eq("id", id)
    .single();

  if (!organization)
    throw createError({ statusCode: 404, statusMessage: "Organization not found." });

  const [
    { data: membersRaw },
    { data: staffList },
    { data: servicesList },
    { data: customersList },
    { data: appointmentsRaw },
    { data: hoursList },
  ] = await Promise.all([
    sb
      .from("memberships")
      .select("*, user:users(*)")
      .eq("organization_id", id),
    sb.from("staff").select("*").eq("organization_id", id),
    sb.from("services").select("*").eq("organization_id", id),
    sb.from("customers").select("*").eq("organization_id", id),
    sb
      .from("appointments")
      .select("*, customer:customers(*), service:services(*), staff:staff(*)")
      .eq("organization_id", id)
      .order("start_at", { ascending: false })
      .limit(25),
    sb.from("business_hours").select("*").eq("organization_id", id),
  ]);

  const members = (membersRaw ?? []).map((m: any) => ({
    membership: m,
    user: m.user,
  }));

  const appointments = (appointmentsRaw ?? []).map((row: any) => ({
    appointment: {
      id: row.id,
      organizationId: row.organization_id,
      customerId: row.customer_id,
      staffId: row.staff_id,
      serviceId: row.service_id,
      startAt: row.start_at,
      endAt: row.end_at,
      status: row.status,
      source: row.source,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
    customer: row.customer,
    service: row.service,
    staff: row.staff,
  }));

  return {
    organization,
    members,
    staff: staffList ?? [],
    services: servicesList ?? [],
    customers: customersList ?? [],
    appointments,
    hours: hoursList ?? [],
  };
});
