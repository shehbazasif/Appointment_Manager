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
});

export const publicBookingSchema = z.object({
  serviceId: z.string().uuid(),
  startAt: z.coerce.date(),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().email().max(254),
  phone: z.string().trim().min(5).max(40),
  notes: z.string().trim().max(1000).optional().nullable(),
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

