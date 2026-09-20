import { and, eq } from "drizzle-orm";
import { readValidatedBody } from "h3";
import { staffSchema } from "#shared/schemas/business";
import { staff } from "../../db/schema";
import { requireDatabase } from "../../utils/database";
import { requireTenant } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  const { organizationId } = await requireTenant(event);
  const id = getRouterParam(event, "id");
  if (!id)
    throw createError({
      statusCode: 400,
      statusMessage: "Staff id is required.",
    });
  const input = await readValidatedBody(event, staffSchema.partial().parse);
  const [member] = await requireDatabase()
    .update(staff)
    .set({
      name: input.name,
      email: input.email,
      phone: input.phone,
      role: input.role,
      active: input.active,
      updatedAt: new Date(),
    })
    .where(and(eq(staff.id, id), eq(staff.organizationId, organizationId)))
    .returning();
  if (!member)
    throw createError({
      statusCode: 404,
      statusMessage: "Staff member not found.",
    });
  return member;
});
