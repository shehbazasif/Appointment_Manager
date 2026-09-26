import { requireTenant } from "../../utils/auth";
import { getUserClient } from "../../utils/supabase";

const mapRow = (row: any) => ({
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
  customer: row.customer
    ? {
        id: row.customer.id,
        firstName: row.customer.first_name ?? "",
        lastName: row.customer.last_name ?? "",
        phone: row.customer.phone ?? "",
        email: row.customer.email ?? null,
      }
    : null,
  service: row.service
    ? {
        id: row.service.id,
        name: row.service.name,
        durationMinutes: row.service.duration_minutes,
        priceCents: row.service.price != null ? Math.round(Number(row.service.price) * 100) : 0,
        accent: row.service.accent ?? "#ca7481",
      }
    : null,
  staff: row.staff
    ? {
        id: row.staff.id,
        name: [row.staff.first_name, row.staff.last_name].filter(Boolean).join(" "),
        role: row.staff.job_title ?? "",
      }
    : null,
});

export default defineEventHandler(async (event) => {
  const { businessId } = await requireTenant(event);
  const sb = await getUserClient(event);

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  // Status counts for today
  const { data: todayAppts } = await sb
    .from("appointments")
    .select("status")
    .eq("business_id", businessId)
    .gte("start_at", startOfToday.toISOString())
    .lt("start_at", endOfToday.toISOString());

  const statusCounts: Record<string, number> = {};
  for (const row of todayAppts ?? []) {
    statusCounts[row.status?.toLowerCase()] =
      (statusCounts[row.status?.toLowerCase()] ?? 0) + 1;
  }

  // Today's appointments with joined data
  const { data: todayAppointments } = await sb
    .from("appointments")
    .select("*, customer:customers(*), service:services(*), staff:staff(*)")
    .eq("business_id", businessId)
    .gte("start_at", startOfToday.toISOString())
    .lt("start_at", endOfToday.toISOString())
    .order("start_at", { ascending: true });

  // Upcoming appointments
  const { data: upcomingAppointments } = await sb
    .from("appointments")
    .select("*, customer:customers(*), service:services(*), staff:staff(*)")
    .eq("business_id", businessId)
    .gte("start_at", now.toISOString())
    .order("start_at", { ascending: true })
    .limit(10);

  // Unassigned count
  const { count: unassignedCount } = await sb
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .is("staff_id", null);

  // Total customers
  const { count: totalCustomers } = await sb
    .from("customers")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId);

  // Total active staff
  const { count: totalStaff } = await sb
    .from("staff")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .eq("status", "ACTIVE");

  // Total active services
  const { count: totalServices } = await sb
    .from("services")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .eq("status", "ACTIVE");

  const totalToday = Object.values(statusCounts).reduce((s, n) => s + n, 0);

  return {
    date: startOfToday.toISOString().slice(0, 10),
    totalToday,
    confirmedToday: statusCounts.confirmed ?? 0,
    completedToday: statusCounts.completed ?? 0,
    cancelledToday: statusCounts.cancelled ?? 0,
    noShowToday: statusCounts.no_show ?? 0,
    pendingToday: statusCounts.pending ?? 0,
    checkedInToday: statusCounts.checked_in ?? 0,
    unassignedCount: unassignedCount ?? 0,
    totalCustomers: totalCustomers ?? 0,
    totalStaff: totalStaff ?? 0,
    totalServices: totalServices ?? 0,
    todayAppointments: (todayAppointments ?? []).map(mapRow),
    upcomingAppointments: (upcomingAppointments ?? []).map(mapRow),
  };
});
