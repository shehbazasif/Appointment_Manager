import { readValidatedBody } from "h3";
import { staffSchema } from "#shared/schemas/business";
import { requireTenant } from "../../utils/auth";
import { getSupabaseAdmin } from "../../utils/supabase";

export default defineEventHandler(async (event) => {
  const { organizationId } = await requireTenant(event);
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "Staff id is required." });

  const input = await readValidatedBody(event, staffSchema.partial().parse);
  const sb = getSupabaseAdmin();

  // Verify the staff member exists and belongs to this org
  const { data: current } = await sb
    .from("staff")
    .select("*")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .single();

  if (!current) throw createError({ statusCode: 404, statusMessage: "Staff member not found." });

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.name !== undefined) updateData.name = input.name;
  if (input.email !== undefined) updateData.email = input.email;
  if (input.phone !== undefined) updateData.phone = input.phone;
  if (input.role !== undefined) updateData.role = input.role;
  if (input.active !== undefined) updateData.active = input.active;

  const { data: member, error } = await sb
    .from("staff")
    .update(updateData)
    .eq("id", id)
    .eq("organization_id", organizationId)
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
        }))
      );
    }
  }

  const { data: currentServices } = await sb
    .from("staff_services")
    .select("service_id")
    .eq("staff_id", id);

  return {
    ...member,
    serviceIds: (currentServices ?? []).map((s: any) => s.service_id),
  };
});
