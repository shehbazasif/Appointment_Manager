import { getQuery } from "h3";
import { requireTenant } from "../../utils/auth";
import { getUserClient } from "../../utils/supabase";

export default defineEventHandler(async (event) => {
  const { businessId } = await requireTenant(event);
  const search = String(getQuery(event).search ?? "").trim();
  const sb = await getUserClient(event);

  let q = sb
    .from("customers")
    .select("*")
    .eq("business_id", businessId)
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  if (search) {
    q = q.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`
    );
  }

  const { data, error } = await q;
  if (error) throw createError({ statusCode: 500, statusMessage: error.message });
  return (data ?? []).map((c: any) => ({
    id: c.id,
    businessId: c.business_id,
    firstName: c.first_name ?? "",
    lastName: c.last_name ?? "",
    email: c.email ?? null,
    phone: c.phone ?? "",
    notes: c.notes ?? null,
    status: c.status ?? "ACTIVE",
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  }));
});
