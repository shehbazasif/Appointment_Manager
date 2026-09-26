import { requireSuperAdmin, serializeBusiness } from "../../../utils/auth";
import { getUserClient } from "../../../utils/supabase";

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event);
  const id = getRouterParam(event, "id");
  if (!id)
    throw createError({ statusCode: 400, statusMessage: "Organization ID is required." });

  const sb = await getUserClient(event);
  const { data: business } = await sb
    .from("businesses")
    .select("*, settings:business_settings(*)")
    .eq("id", id)
    .single();

  if (!business)
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
      .from("business_members")
      .select("*, profile:profiles(*)")
      .eq("business_id", id),
    sb.from("staff").select("*").eq("business_id", id),
    sb.from("services").select("*").eq("business_id", id),
    sb.from("customers").select("*").eq("business_id", id),
    sb
      .from("appointments")
      .select("*, customer:customers(*), service:services(*), staff:staff(*)")
      .eq("business_id", id)
      .order("start_at", { ascending: false })
      .limit(25),
    sb.from("business_hours").select("*").eq("business_id", id),
  ]);

  const members = (membersRaw ?? []).map((m: any) => ({
    membership: {
      id: m.id,
      businessId: m.business_id,
      userId: m.user_id,
      role: m.role,
      status: m.status,
    },
    user: m.profile
      ? {
          id: m.profile.id,
          firstName: m.profile.first_name,
          lastName: m.profile.last_name,
          avatarUrl: m.profile.avatar_url,
          phone: m.profile.phone,
        }
      : null,
  }));

  const appointments = (appointmentsRaw ?? []).map((row: any) => ({
    appointment: {
      id: row.id,
      organizationId: row.business_id,
      customerId: row.customer_id,
      staffId: row.staff_id,
      serviceId: row.service_id,
      startAt: row.start_at,
      endAt: row.end_at,
      status: row.status,
      source: row.booking_source,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
    customer: row.customer,
    service: row.service,
    staff: row.staff,
  }));

  return {
    organization: serializeBusiness(business, (business as any).settings?.[0] ?? null),
    members,
    staff: staffList ?? [],
    services: servicesList ?? [],
    customers: customersList ?? [],
    appointments,
    hours: hoursList ?? [],
  };
});
