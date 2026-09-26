import { z } from "zod";

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens only.")
  .min(3)
  .max(80);

export const bootstrapSchema = z.object({
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().min(1).max(80).optional(),
  businessName: z.string().trim().min(2).max(120).optional(),
  businessSlug: slugSchema.optional(),
});

export type BootstrapInput = z.infer<typeof bootstrapSchema>;
