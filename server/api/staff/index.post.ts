import { readValidatedBody, setResponseStatus } from "h3";
import { staffSchema } from "#shared/schemas/business";
import { staff } from "../../db/schema";
import { requireDatabase } from "../../utils/database";
import { requireTenant } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  const { organizationId } = await requireTenant(event);
  const input = await readValidatedBody(event, staffSchema.parse);
  const [member] = await requireDatabase()
    .insert(staff)
    .values({
      organizationId,
      name: input.name,
      email: input.email,
      phone: input.phone,
      role: input.role,
      active: input.active,
    })
    .returning();
  setResponseStatus(event, 201);
  return member;
});
