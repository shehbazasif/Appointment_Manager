import { readValidatedBody, setResponseStatus } from "h3";
import { staffSchema } from "#shared/schemas/business";
import { requireTenant } from "../../utils/auth";
import { getSupabaseAdmin } from "../../utils/supabase";

export default defineEventHandler(async (event) => {
  const { organizationId } = await requireTenant(event);
  const input = await readValidatedBody(event, staffSchema.parse);
  const sb = getSupabaseAdmin();

  const { data: member, error } = await sb
    .from("staff")
    .insert({
      organization_id: organizationId,
      name: input.name,
      email: input.email,
      phone: input.phone,
      role: input.role,
      active: input.active ?? true,
    })
    .select()
    .single();

  if (error) throw createError({ statusCode: 500, statusMessage: error.message });

  if (input.serviceIds && input.serviceIds.length > 0) {
    await sb.from("staff_services").upsert(
      input.serviceIds.map((serviceId) => ({
        staff_id: member.id,
        service_id: serviceId,
      })),
      { onConflict: "staff_id,service_id" }
    );
  }

  setResponseStatus(event, 201);
  return { ...member, serviceIds: input.serviceIds ?? [] };
});
