/**
 * ONE place for the product name. Change it here and every public page,
 * header, footer, page title and email text follows.
 * (Technical ids such as the Android package id are NOT derived from this.)
 */
export const BRAND = {
  name: "Rantevou",
  /** Short line used in titles and social previews. */
  tagline: "Online booking & appointment manager for small businesses",
  /** Longer description for search engines and social cards. */
  description:
    "Rantevou gives salons, clinics, pet care, towing and home-service businesses one simple place for online booking, reminders, staff, customers and on-location jobs.",
  /**
   * Public contact address for queries, shown in the footer, Contact page,
   * legal pages and contact-form error messages.
   */
  email: "info@rantevou.feroferto.com",
  /** Where the company is based (footer line). */
  basedIn: "Athens, Greece",
  /** Public company phone in international format, e.g. "+30 210 123 4567" ("" = not shown). */
  telephone: "",
  /**
   * Official profiles of the company (LinkedIn, Facebook, Instagram, Google
   * Business, app stores…). Used as schema.org `sameAs` so search engines and
   * AI agents can confirm they are the same company. Full https:// links only.
   */
  sameAs: [] as readonly string[],
} as const;

/** "Page name · Rantevou" style titles. */
export const brandTitle = (page?: string) =>
  page ? `${page} · ${BRAND.name}` : `${BRAND.name} — ${BRAND.tagline}`;
