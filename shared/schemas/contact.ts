import { z } from "zod";

export const CONTACT_TOPICS = ["Sales & pricing", "Help with my account", "Partnership", "Something else"] as const;

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(80),
  email: z.string().trim().email("Please enter a valid email address.").max(160),
  business: z.string().trim().max(120).optional().default(""),
  topic: z.enum(CONTACT_TOPICS).default("Something else"),
  message: z.string().trim().min(10, "Please write at least a short message (10+ characters).").max(4000),
  /** Honeypot: real people never fill this in. */
  website: z.string().max(200).optional().default(""),
});

export type ContactInput = z.infer<typeof contactSchema>;
