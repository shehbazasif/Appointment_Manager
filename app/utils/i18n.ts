/**
 * Languages the dashboard and booking page can be shown in.
 * To add a language: add it here and create app/locales/<code>.ts
 * (an object of English text → translated text). Missing entries fall
 * back to English automatically.
 */
export const LOCALES = [
  { code: "en", name: "English", english: "English", intl: "en-GB", dir: "ltr" },
  { code: "el", name: "Ελληνικά", english: "Greek", intl: "el-GR", dir: "ltr" },
  { code: "ar", name: "العربية", english: "Arabic", intl: "ar", dir: "rtl" },
  { code: "fr", name: "Français", english: "French", intl: "fr-FR", dir: "ltr" },
  { code: "it", name: "Italiano", english: "Italian", intl: "it-IT", dir: "ltr" },
] as const;

export type LocaleCode = (typeof LOCALES)[number]["code"];
export const LOCALE_CODES = LOCALES.map((l) => l.code) as LocaleCode[];
export const DEFAULT_LOCALE: LocaleCode = "en";

export const isLocale = (v: unknown): v is LocaleCode =>
  typeof v === "string" && (LOCALE_CODES as string[]).includes(v);

export const localeInfo = (code: string) => LOCALES.find((l) => l.code === code) ?? LOCALES[0];

/** Suggested language for a country (used as a default when a business picks its country). */
export const LOCALE_FOR_COUNTRY: Record<string, LocaleCode> = {
  GR: "el", CY: "el",
  FR: "fr", BE: "fr", LU: "fr", MC: "fr",
  IT: "it", SM: "it", VA: "it",
  QA: "ar", AE: "ar", SA: "ar", KW: "ar", BH: "ar", OM: "ar", JO: "ar", EG: "ar", LB: "ar", MA: "ar", TN: "ar", DZ: "ar", IQ: "ar",
};

/** English label for an appointment status code (translate with t()). */
const STATUS_TEXT: Record<string, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  CHECKED_IN: "Checked in",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No-show",
};
export const statusText = (s?: string | null) =>
  (s && STATUS_TEXT[s]) || String(s ?? "").replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

/** English label for an on-location job status. */
const FIELD_TEXT: Record<string, string> = {
  ASSIGNED: "Assigned",
  ON_THE_WAY: "On the way",
  ON_LOCATION: "On location",
};
export const fieldText = (s?: string | null) => (s && FIELD_TEXT[s]) || "Not assigned";

/** English weekday names, Sunday first (translate with t()). */
export const WEEKDAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
