import { readValidatedBody, setResponseStatus } from "h3";
import { serviceSchema } from "#shared/schemas/business";
import { services } from "../../db/schema";
import { requireDatabase } from "../../utils/database";
import { requireSession } from "../../utils/session";

export default defineEventHandler(async (event) => {
  const { organizationId } = requireSession(event);
  const input = await readValidatedBody(event, serviceSchema.parse);
  const [service] = await requireDatabase()
    .insert(services)
    .values({ ...input, organizationId })
    .returning();
  setResponseStatus(event, 201);
  return service;
});
