import { getQuery } from "h3";
import { requireTenant } from "../../utils/auth";
import { getSupabaseAdmin } from "../../utils/supabase";

export default defineEventHandler(async (event) => {
  const { organizationId } = await requireTenant(event);
  const query = getQuery(event);
  const sb = getSupabaseAdmin();

  let q = sb
    .from("appointments")
    .select(
      "*, customer:customers(*), service:services(*), staff:staff(*)"
    )
    .eq("organization_id", organizationId)
    .order("start_at", { ascending: true });

  if (query.start) q = q.gte("start_at", String(query.start));
  if (query.end) q = q.lt("start_at", String(query.end));
  if (query.status && query.status !== "ALL") q = q.eq("status", String(query.status));

  if (query.staffId) {
    if (query.staffId === "unassigned") {
      q = q.is("staff_id", null);
    } else {
      q = q.eq("staff_id", String(query.staffId));
    }
  }

  const search = String(query.search ?? "").trim();
  if (search) {
    // Search is done via customer fields — fetch matching customer ids first
    const { data: matchedCustomers } = await sb
      .from("customers")
      .select("id")
      .eq("organization_id", organizationId)
      .or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`
      );

    const customerIds = (matchedCustomers ?? []).map((c) => c.id);
    if (customerIds.length === 0) return [];
    q = q.in("customer_id", customerIds);
  }

  const { data, error } = await q;
  if (error) throw createError({ statusCode: 500, statusMessage: error.message });

  return (data ?? []).map((row: any) => ({
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
});
