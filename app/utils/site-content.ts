import {
  CalendarCheck,
  BellRing,
  Users,
  UserRound,
  QrCode,
  FileSpreadsheet,
  MapPinned,
  MessageCircle,
  Globe2,
  Tags,
  LayoutDashboard,
  ShieldCheck,
  Scissors,
  Stethoscope,
  PawPrint,
  Truck,
  Wrench,
  Sparkles,
} from "lucide-vue-next";

/** Copy shared by the public pages (home, features, industries, FAQ…). */

export const SITE_FEATURES = [
  {
    icon: CalendarCheck,
    title: "Online booking, 24/7",
    text: "Share one link on Instagram, Google or WhatsApp. Customers pick a service, a time and book — even while you sleep.",
  },
  {
    icon: BellRing,
    title: "Automatic reminders",
    text: "Confirmation and reminder emails go out on their own, so fewer people forget and fewer slots stay empty.",
  },
  {
    icon: LayoutDashboard,
    title: "Today, at a glance",
    text: "Open the app and see today's schedule first: who is coming, when, with whom, and what is next.",
  },
  {
    icon: Users,
    title: "Staff & working hours",
    text: "Give every team member their own hours and services. Bookings only land when someone is actually free.",
  },
  {
    icon: UserRound,
    title: "Customer history",
    text: "Phone, email, past visits and notes in one place. Call or WhatsApp a customer with one tap.",
  },
  {
    icon: MapPinned,
    title: "On-location jobs",
    text: "Customers share their exact location when booking. Staff get directions and a WhatsApp message in one tap.",
  },
  {
    icon: QrCode,
    title: "Attendance with QR",
    text: "Every staff member gets a personal QR badge. Tap Enter or Exit and scan it at the door — no paper sign-in sheets.",
  },
  {
    icon: FileSpreadsheet,
    title: "Excel & CSV import",
    text: "Already have your customers or staff in a spreadsheet? Import them in minutes, not days.",
  },
  {
    icon: Globe2,
    title: "Any country, any currency",
    text: "Pick your country and the time zone and currency follow. Euro, riyal, dirham, pound — prices show the right way.",
  },
  {
    icon: Tags,
    title: "Service categories",
    text: "Group services into Hair, Nails, Check-ups or Emergency calls so customers find the right one fast.",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp & email messages",
    text: "Send a quick message to a customer from their booking, using templates you can reuse.",
  },
  {
    icon: ShieldCheck,
    title: "Private by design",
    text: "Each business only sees its own data. Secure sign-in, encrypted connections and GDPR in mind.",
  },
];

export const SITE_STEPS = [
  {
    title: "Create your business",
    text: "Sign up, choose your country and add your services, prices and opening hours. About five minutes.",
  },
  {
    title: "Share your booking link",
    text: "Put your link on Instagram, Google Maps, your website or send it on WhatsApp. Customers book themselves.",
  },
  {
    title: "Run the day from your phone",
    text: "See today's bookings, check customers in, message staff and keep everyone on time — from anywhere.",
  },
];

export const SITE_INDUSTRIES = [
  {
    id: "salons",
    icon: Scissors,
    name: "Salons & barbers",
    image: "/images/barber.webp",
    alt: "Barber trimming a customer's beard in a dark, modern barbershop",
    short: "Hair, nails, beauty and barbershops.",
    text: "Let clients book a cut, colour or manicure with their favourite stylist. Each stylist has their own hours, services and calendar, and reminders cut down on no-shows.",
    points: ["Book by stylist and service", "Reminders before every visit", "Client notes and history"],
  },
  {
    id: "clinics",
    icon: Stethoscope,
    name: "Clinics & therapists",
    image: "/images/clinic.webp",
    alt: "Bright, clean dental treatment room with a modern dental chair",
    short: "Dental, physio, psychology and wellness.",
    text: "Patients choose a treatment and a free slot online, while reception keeps the full day in view. Check patients in on arrival and keep visit history together.",
    points: ["Treatment lengths that fit your day", "Check-in on arrival", "Visit history per patient"],
  },
  {
    id: "pet-care",
    icon: PawPrint,
    name: "Pet care & grooming",
    image: "/images/pet-care.webp",
    alt: "Groomer gently washing a happy golden retriever",
    short: "Groomers, vets and pet sitters.",
    text: "Owners book a wash, trim or check-up in seconds. Use categories for grooming, care and visits, and keep owner details and notes ready for the next appointment.",
    points: ["Categories for every service", "Owner contact in one tap", "Notes for each visit"],
  },
  {
    id: "towing",
    icon: Truck,
    name: "Towing & car services",
    image: "/images/auto.webp",
    alt: "Mechanic checking a car engine under an open hood",
    short: "Roadside help, mobile mechanics, car wash.",
    text: "When a customer books, they can share their exact GPS location. Your driver gets a map link and a WhatsApp message, and marks the job On the way and On location.",
    points: ["Customer shares live location", "Map + WhatsApp for the driver", "On the way / On location status"],
  },
  {
    id: "home-services",
    icon: Wrench,
    name: "Home services",
    image: "/images/home-services.webp",
    alt: "Electrician in a hard hat and gloves working on a fuse box",
    short: "Electricians, plumbers, AC and repairs.",
    text: "Take bookings for visits at the customer's address, assign them to the right technician and keep the whole team's day organised — no more missed calls.",
    points: ["Bookings at the customer's address", "Assign to a technician", "Clear day plan per person"],
  },
  {
    id: "cleaning",
    icon: Sparkles,
    name: "Cleaning & care",
    image: "/images/cleaning.webp",
    alt: "Cleaner in gloves and a mask wiping a bright window",
    short: "Cleaning teams, home care, tutors.",
    text: "Recurring customers, several teams and visits across the city. See who goes where today and let customers pick a time that suits them.",
    points: ["Teams with their own hours", "Customers pick the time", "Attendance with QR"],
  },
];

export const SITE_FAQS = [
  {
    q: "Is there a free trial?",
    a: `Yes. Every plan starts with a free trial, no card needed. You can set up your services, share your booking link and take real bookings before you decide.`,
  },
  {
    q: "Do my customers need to download an app?",
    a: "No. Customers book on a normal web page that works on any phone or computer. You and your team can add the dashboard to your iPhone or Android home screen like an app.",
  },
  {
    q: "Does it work outside Greece?",
    a: "Yes. Choose your country and the time zone and currency are set for you — for example Qatar (QAR), the UAE (AED), the UK (GBP) or anywhere in the euro area. Working hours follow your local time.",
  },
  {
    q: "Can customers share their location for on-site jobs?",
    a: "Yes. Turn on On-location service in Settings. Customers can share their GPS location or paste a Google Maps link when booking, and your staff get a map link and a WhatsApp message.",
  },
  {
    q: "Can I import my existing customers?",
    a: "Yes. Upload an Excel or CSV file on the Customers or Staff page and match the columns. Everything is added to your account in a few minutes.",
  },
  {
    q: "How do reminders work?",
    a: "When a booking is made, the customer gets a confirmation email, and a reminder is sent automatically before the appointment. You can also message customers on WhatsApp from the booking.",
  },
  {
    q: "Is my data safe?",
    a: "Each business can only see its own data. Sign-in is secure, every connection is encrypted and we follow GDPR. You can ask us to export or delete your data at any time.",
  },
  {
    q: "Can I cancel any time?",
    a: "Yes. There is no contract. Monthly plans stop at the end of the month; yearly plans run until the end of the paid year.",
  },
];
