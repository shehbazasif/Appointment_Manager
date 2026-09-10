import type {
  Appointment,
  BusinessProfile,
  Customer,
  Service,
  StaffMember,
} from "#shared/types/domain";

export const demoBusiness: BusinessProfile = {
  name: "Maria Beauty Studio",
  slug: "maria-beauty-studio",
  city: "Athens",
  country: "Greece",
  timezone: "Europe/Athens",
  phone: "+30 210 555 0184",
  bookingActive: true,
};

export const demoServices: Service[] = [
  {
    id: "s1",
    name: "Classic manicure",
    category: "Nails",
    durationMinutes: 45,
    priceCents: 1800,
    active: true,
    accent: "#e6a4a4",
  },
  {
    id: "s2",
    name: "Gel manicure",
    category: "Nails",
    durationMinutes: 60,
    priceCents: 2800,
    active: true,
    accent: "#d77f90",
  },
  {
    id: "s3",
    name: "Blow dry & styling",
    category: "Hair",
    durationMinutes: 45,
    priceCents: 2200,
    active: true,
    accent: "#9b9acb",
  },
  {
    id: "s4",
    name: "Signature facial",
    category: "Skin",
    durationMinutes: 75,
    priceCents: 4500,
    active: true,
    accent: "#78b4a7",
  },
  {
    id: "s5",
    name: "Brow shaping",
    category: "Beauty",
    durationMinutes: 30,
    priceCents: 1200,
    active: true,
    accent: "#d2a16b",
  },
  {
    id: "s6",
    name: "Balayage consultation",
    category: "Hair",
    durationMinutes: 30,
    priceCents: 1000,
    active: true,
    accent: "#8aa8be",
  },
];

export const demoStaff: StaffMember[] = [
  {
    id: "st1",
    name: "Maria Papadopoulou",
    role: "Owner · Hair & beauty",
    initials: "MP",
    color: "#d77f90",
  },
  {
    id: "st2",
    name: "Eleni Georgiou",
    role: "Nail artist",
    initials: "EG",
    color: "#78b4a7",
  },
  {
    id: "st3",
    name: "Sofia Nikolaou",
    role: "Skin specialist",
    initials: "SN",
    color: "#9b9acb",
  },
];

export const demoAppointments: Appointment[] = [
  {
    id: "a1",
    customerName: "Anna Kouris",
    serviceId: "s4",
    staffId: "st3",
    time: "09:30",
    durationMinutes: 75,
    status: "COMPLETED",
    source: "ONLINE",
  },
  {
    id: "a2",
    customerName: "Niki Vrettou",
    serviceId: "s2",
    staffId: "st2",
    time: "10:00",
    durationMinutes: 60,
    status: "CONFIRMED",
    source: "ONLINE",
  },
  {
    id: "a3",
    customerName: "Dimitris Laskaris",
    serviceId: "s3",
    staffId: "st1",
    time: "11:15",
    durationMinutes: 45,
    status: "CONFIRMED",
    source: "MANUAL",
  },
  {
    id: "a4",
    customerName: "Katerina Mavri",
    serviceId: "s5",
    staffId: "st3",
    time: "12:00",
    durationMinutes: 30,
    status: "PENDING",
    source: "ONLINE",
  },
  {
    id: "a5",
    customerName: "Georgia Antoniou",
    serviceId: "s1",
    staffId: "st2",
    time: "13:30",
    durationMinutes: 45,
    status: "CONFIRMED",
    source: "ONLINE",
  },
  {
    id: "a6",
    customerName: "Iro Theodorou",
    serviceId: "s3",
    staffId: "st1",
    time: "15:00",
    durationMinutes: 45,
    status: "CONFIRMED",
    source: "ONLINE",
  },
];

export const demoCustomers: Customer[] = [
  {
    id: "c1",
    name: "Anna Kouris",
    phone: "+30 694 123 8801",
    visits: 12,
    lastVisit: "Today",
  },
  {
    id: "c2",
    name: "Niki Vrettou",
    phone: "+30 697 442 1018",
    visits: 8,
    lastVisit: "Today",
  },
  {
    id: "c3",
    name: "Dimitris Laskaris",
    phone: "+30 693 802 6654",
    visits: 5,
    lastVisit: "18 Aug 2026",
  },
  {
    id: "c4",
    name: "Katerina Mavri",
    phone: "+30 698 731 4402",
    visits: 3,
    lastVisit: "04 Aug 2026",
  },
];

export const getService = (serviceId: string) =>
  demoServices.find((service) => service.id === serviceId);
export const getStaff = (staffId: string) =>
  demoStaff.find((staff) => staff.id === staffId);
