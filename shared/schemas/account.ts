import { z } from "zod";

export const emailChangeRequestSchema = z.object({
  newEmail: z.string().trim().toLowerCase().email().max(254),
});

export const emailChangeConfirmSchema = z.object({
  newEmail: z.string().trim().toLowerCase().email().max(254),
  code: z.string().trim().regex(/^\d{6}$/, "Code must be 6 digits"),
});

export const phoneChangeRequestSchema = z.object({
  newPhone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s\-()]{6,20}$/, "Enter a valid mobile number"),
});

export const phoneChangeConfirmSchema = z.object({
  newPhone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s\-()]{6,20}$/, "Enter a valid mobile number"),
  code: z.string().trim().regex(/^\d{6}$/, "Code must be 6 digits"),
});
