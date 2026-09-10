export type AppointmentStatus =
  | "CONFIRMED"
  | "PENDING"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export interface Service {
  id: string;
  name: string;
  category: string;
  durationMinutes: number;
  priceCents: number;
  active: boolean;
  accent: string;
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  initials: string;
  color: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  visits: number;
  lastVisit: string;
}

export interface Appointment {
  id: string;
  customerName: string;
  serviceId: string;
  staffId: string;
  time: string;
  durationMinutes: number;
  status: AppointmentStatus;
  source: "ONLINE" | "MANUAL";
}

export interface BusinessProfile {
  name: string;
  slug: string;
  city: string;
  country: string;
  timezone: string;
  phone: string;
  bookingActive: boolean;
}
