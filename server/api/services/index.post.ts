import { readValidatedBody, setResponseStatus } from "h3";
import { serviceSchema } from "#shared/schemas/business";
import { services } from "../../db/schema";
import { requireDatabase } from "../../utils/database";
import { requireTenant } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  const { organizationId } = await requireTenant(event);
  const input = await readValidatedBody(event, serviceSchema.parse);
  const [service] = await requireDatabase()
    .insert(services)
    .values({ ...input, organizationId })
    .returning();
  setResponseStatus(event, 201);
  return service;
});
