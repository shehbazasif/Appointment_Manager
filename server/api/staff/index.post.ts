import { readValidatedBody, setResponseStatus } from "h3";
import { staffSchema } from "#shared/schemas/business";
import { staff } from "../../db/schema";
import { requireDatabase } from "../../utils/database";
import { requireSession } from "../../utils/session";

export default defineEventHandler(async (event) => {
  const { organizationId } = requireSession(event);
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
