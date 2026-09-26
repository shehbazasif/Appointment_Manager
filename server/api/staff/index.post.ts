import { readValidatedBody, setResponseStatus } from "h3";
import { staffSchema } from "#shared/schemas/business";
import { requireTenant } from "../../utils/auth";
import { getUserClient } from "../../utils/supabase";

export default defineEventHandler(async (event) => {
  const { businessId } = await requireTenant(event);
  const input = await readValidatedBody(event, staffSchema.parse);
  const sb = await getUserClient(event);

  // The UI submits a single `name`; split it into the two real columns
  const nameParts = input.name.trim().split(/\s+/);
  const firstName = nameParts[0] ?? "";
  const lastName = nameParts.slice(1).join(" ") || "";

  const { data: member, error } = await sb
    .from("staff")
    .insert({
      business_id: businessId,
      first_name: firstName,
      last_name: lastName,
      email: input.email ?? null,
      phone: input.phone ?? null,
      job_title: input.role,
      status: input.active ? "ACTIVE" : "INACTIVE",
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
      { onConflict: "staff_id,service_id" },
    );
  }

  setResponseStatus(event, 201);
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
    serviceIds: input.serviceIds ?? [],
  };
});
