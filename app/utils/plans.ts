/**
 * Pricing plans shown on /pricing and the home page teaser.
 * Edit names, prices and features here — nothing else needs to change.
 * Prices are per month, in `PLAN_CURRENCY`. `yearly` is the monthly price
 * when paid yearly.
 */
export const PLAN_CURRENCY = "EUR";
export const TRIAL_DAYS = 14;

export interface Plan {
  id: string;
  name: string;
  description: string;
  monthly: number;
  yearly: number;
  highlighted?: boolean;
  badge?: string;
  cta: string;
  features: string[];
}

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    description: "For a solo professional who wants bookings online.",
    monthly: 19,
    yearly: 15,
    cta: "Start free trial",
    features: [
      "1 staff calendar",
      "Unlimited online bookings",
      "Your own booking link",
      "Email confirmations & reminders",
      "Customer list with history",
      "Excel / CSV import",
    ],
  },
  {
    id: "business",
    name: "Business",
    description: "For a growing team with several people and services.",
    monthly: 39,
    yearly: 32,
    highlighted: true,
    badge: "Most popular",
    cta: "Start free trial",
    features: [
      "Up to 10 staff calendars",
      "Everything in Starter",
      "Staff working hours & roles",
      "Attendance with QR check-in",
      "On-location jobs with customer GPS",
      "WhatsApp hand-off to staff",
      "Service categories & multi-currency",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    description: "For busy multi-team businesses and field services.",
    monthly: 79,
    yearly: 65,
    cta: "Start free trial",
    features: [
      "Unlimited staff calendars",
      "Everything in Business",
      "Priority email support",
      "Help with setup & data import",
      "Early access to new features",
    ],
  },
];

/** "€19" — whole numbers, the plan currency. */
export const formatPlanPrice = (amount: number) =>
  new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: PLAN_CURRENCY,
    maximumFractionDigits: 0,
  }).format(amount);
