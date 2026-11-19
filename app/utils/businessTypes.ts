/**
 * Business types (templates). Choosing one in Settings suggests the
 * settings that suit that kind of business; the owner can still change
 * every setting afterwards. Nothing is changed until they press "Apply".
 */
export type BusinessType = "general" | "clinic" | "pet_grooming" | "salon" | "field_service";

export interface BusinessTypePreset {
  id: BusinessType;
  name: string;
  description: string;
  /** settings applied with "Apply recommended settings" */
  settings: {
    tokensEnabled: boolean;
    showTokenToCustomer: boolean;
    onLocationEnabled: boolean;
    slotStepMinutes: number;
  };
  /** short lines shown on the card */
  highlights: string[];
}

export const BUSINESS_TYPES: BusinessTypePreset[] = [
  {
    id: "clinic",
    name: "Clinic / medical centre",
    description: "Patients get a token number and wait in a queue.",
    settings: { tokensEnabled: true, showTokenToCustomer: true, onLocationEnabled: false, slotStepMinutes: 15 },
    highlights: ["Token numbers and printed tickets", "Patient sees their token", "A booking every 15 min"],
  },
  {
    id: "pet_grooming",
    name: "Pet grooming",
    description: "Longer appointments, no queue tokens.",
    settings: { tokensEnabled: false, showTokenToCustomer: false, onLocationEnabled: false, slotStepMinutes: 30 },
    highlights: ["No token numbers", "A booking every 30 min"],
  },
  {
    id: "salon",
    name: "Salon / beauty",
    description: "Clients book a stylist and a time.",
    settings: { tokensEnabled: false, showTokenToCustomer: false, onLocationEnabled: false, slotStepMinutes: 30 },
    highlights: ["No token numbers", "A booking every 30 min"],
  },
  {
    id: "field_service",
    name: "Home or field service",
    description: "Your staff go to the customer (towing, cleaning, repairs).",
    settings: { tokensEnabled: false, showTokenToCustomer: false, onLocationEnabled: true, slotStepMinutes: 60 },
    highlights: ["Customer shares their location", "Send jobs to staff on WhatsApp", "A booking every 60 min"],
  },
  {
    id: "general",
    name: "Other",
    description: "A simple setup you adjust yourself.",
    settings: { tokensEnabled: true, showTokenToCustomer: false, onLocationEnabled: false, slotStepMinutes: 30 },
    highlights: ["Token numbers on", "A booking every 30 min"],
  },
];

export const businessTypeOf = (id?: string | null) =>
  BUSINESS_TYPES.find((b) => b.id === id) ?? BUSINESS_TYPES[BUSINESS_TYPES.length - 1]!;
