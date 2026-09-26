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
  email: z.string().email().max(254).optional().nullable(),
  phone: z.string().trim().min(5).max(40),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export const organizationSettingsSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9-]+$/i, "Slug must be URL-safe").optional(),
  description: z.string().trim().max(1000).optional().nullable(),
  logoUrl: z.string().trim().url().max(2000).optional().nullable(),
  businessType: z
    .enum(["hair", "barber", "beauty", "spa", "massage", "other"])
    .optional()
    .nullable(),
  monthlyRevenue: z
    .enum(["<2k", "2k-5k", "5k-10k", "10k+"])
    .optional()
    .nullable(),
  email: z.string().email().max(254).optional(),
  phone: z.string().trim().max(40).optional().nullable(),
  address: z.string().trim().max(200).optional().nullable(),
  city: z.string().trim().max(100).optional().nullable(),
  country: z.string().trim().max(100).optional(),
  timezone: z.string().trim().max(100).optional(),
  currency: z.string().trim().max(10).optional(),
  bookingActive: z.boolean().optional(),
});

export const dayHoursSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  enabled: z.boolean().default(true),
});

export const businessHoursBatchSchema = z.object({
  hours: z.array(dayHoursSchema),
});

