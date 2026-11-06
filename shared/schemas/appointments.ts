import { z } from "zod";

export const appointmentSchema = z.object({
  customerId: z.string().uuid(),
  staffId: z.string().uuid().nullable().optional(),
  serviceId: z.string().uuid(),
  startAt: z.coerce.date(),
  notes: z.string().trim().max(1000).optional().nullable(),
  source: z.enum(["ONLINE", "MANUAL"]).default("MANUAL"),
});

export const updateAppointmentSchema = z.object({
  staffId: z.string().uuid().nullable().optional(),
  serviceId: z.string().uuid().optional(),
  startAt: z.coerce.date().optional(),
  status: z
    .enum([
      "PENDING",
      "CONFIRMED",
      "CHECKED_IN",
      "COMPLETED",
      "CANCELLED",
      "NO_SHOW",
      "RESCHEDULED",
    ])
    .optional(),
  notes: z.string().trim().max(1000).optional().nullable(),
  // On-location workflow step (only used when the business enabled on-location service)
  fieldStatus: z.enum(["ASSIGNED", "ON_THE_WAY", "ON_LOCATION"]).nullable().optional(),
});

export const publicBookingSchema = z.object({
  serviceId: z.string().uuid(),
  startAt: z.coerce.date(),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  // Email is optional: an empty value means "not provided".
  email: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().email().max(254).optional().nullable(),
  ),
  // Digits only, with country code: +<country code><number> (spaces/dashes are ignored).
  phone: z
    .string()
    .trim()
    .transform((s) => s.replace(/[\s\-().]/g, ""))
    .pipe(z.string().regex(/^\+[1-9]\d{6,14}$/, "Enter a valid phone number with its country code.")),
  notes: z.string().trim().max(1000).optional().nullable(),
  // One-time current location (on-location businesses only)
  location: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
      accuracy: z.number().min(0).max(100000).optional().nullable(),
      note: z.string().trim().max(300).optional().nullable(),
    })
    .optional()
    .nullable(),
});

export const appointmentStatusSchema = z.object({
  status: z.enum([
    "PENDING",
    "CONFIRMED",
    "CHECKED_IN",
    "COMPLETED",
    "CANCELLED",
    "NO_SHOW",
    "RESCHEDULED",
  ]),
});

