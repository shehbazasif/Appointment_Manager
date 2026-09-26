import { readValidatedBody } from "h3";
import { staffSchema } from "#shared/schemas/business";
import { requireTenant } from "../../utils/auth";
import { getUserClient } from "../../utils/supabase";

export default defineEventHandler(async (event) => {
  const { businessId } = await requireTenant(event);
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "Staff id is required." });

  const input = await readValidatedBody(event, staffSchema.partial().parse);
  const sb = await getUserClient(event);

  // Verify the staff member exists and belongs to this business
  const { data: current } = await sb
    .from("staff")
    .select("*")
    .eq("id", id)
    .eq("business_id", businessId)
    .single();

  if (!current) throw createError({ statusCode: 404, statusMessage: "Staff member not found." });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.name !== undefined) {
    const nameParts = input.name.trim().split(/\s+/);
    updates.first_name = nameParts[0] ?? "";
    updates.last_name = nameParts.slice(1).join(" ");
  }
  if (input.email !== undefined) updates.email = input.email;
  if (input.phone !== undefined) updates.phone = input.phone;
  if (input.role !== undefined) updates.job_title = input.role;
  if (input.active !== undefined) updates.status = input.active ? "ACTIVE" : "INACTIVE";

  const { data: member, error } = await sb
    .from("staff")
    .update(updates)
    .eq("id", id)
    .eq("business_id", businessId)
    .select()
    .single();

  if (error) throw createError({ statusCode: 500, statusMessage: error.message });

  if (input.serviceIds !== undefined) {
    // Replace all service assignments
    await sb.from("staff_services").delete().eq("staff_id", id);
    if (input.serviceIds.length > 0) {
      await sb.from("staff_services").insert(
        input.serviceIds.map((serviceId) => ({
          staff_id: id,
          service_id: serviceId,
        })),
      );
    }
  }

  const { data: currentServices } = await sb
    .from("staff_services")
    .select("service_id")
    .eq("staff_id", id);

  return {
    id: member.id,
    businessId: member.business_id,
    userId: member.user_id ?? null,
    name: [member.first_name, member.last_name].filter(Boolean).join(" "),
    firstName: member.first_name ?? "",
    lastName: member.last_name ?? "",
    email: member.email ?? null,
    phone: member.phone ?? null,
    role: member.job_title ?? "Staff",
    active: member.status === "ACTIVE",
    serviceIds: (currentServices ?? []).map((s: any) => s.service_id),
  };
});
