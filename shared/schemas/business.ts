import { z } from "zod";

export const serviceSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
  category: z.string().trim().min(2).max(80),
  durationMinutes: z.number().int().min(5).max(480),
  priceCents: z.number().int().min(0).max(1000000),
  active: z.boolean().default(true),
  accent: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i)
    .default("#ca7481"),
});

export const staffSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().email().max(254).optional(),
  phone: z.string().trim().max(40).optional(),
  role: z.string().trim().min(2).max(80),
  active: z.boolean().default(true),
  serviceIds: z.array(z.string().uuid()).default([]),
});

export const customerSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().email().max(254).optional(),
  phone: z.string().trim().min(5).max(40),
  notes: z.string().trim().max(1000).optional(),
});
