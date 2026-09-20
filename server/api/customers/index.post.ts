import { readValidatedBody, setResponseStatus } from "h3";
import { customerSchema } from "#shared/schemas/business";
import { customers } from "../../db/schema";
import { requireDatabase } from "../../utils/database";
import { requireTenant } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  const { organizationId } = await requireTenant(event);
  const input = await readValidatedBody(event, customerSchema.parse);
  const [customer] = await requireDatabase()
    .insert(customers)
    .values({ ...input, organizationId })
    .returning();
  setResponseStatus(event, 201);
  return customer;
});
