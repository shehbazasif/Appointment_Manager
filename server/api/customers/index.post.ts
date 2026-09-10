import { readValidatedBody, setResponseStatus } from "h3";
import { customerSchema } from "#shared/schemas/business";
import { customers } from "../../db/schema";
import { requireDatabase } from "../../utils/database";
import { requireSession } from "../../utils/session";

export default defineEventHandler(async (event) => {
  const { organizationId } = requireSession(event);
  const input = await readValidatedBody(event, customerSchema.parse);
  const [customer] = await requireDatabase()
    .insert(customers)
    .values({ ...input, organizationId })
    .returning();
  setResponseStatus(event, 201);
  return customer;
});
