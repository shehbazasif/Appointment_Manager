/**
 * ONE place for the product name. Change it here and every public page,
 * header, footer, page title and email text follows.
 * (Technical ids such as the Android package id are NOT derived from this.)
 */
export const BRAND = {
  name: "Reventos",
  /** Short line used in titles and social previews. */
  tagline: "Online booking & appointment manager for small businesses",
  /** Longer description for search engines and social cards. */
  description:
    "Reventos gives salons, clinics, pet care, towing and home-service businesses one simple place for online booking, reminders, staff, customers and on-location jobs.",
  /**
   * Public contact address for queries, shown in the footer, Contact page,
   * legal pages and contact-form error messages.
   */
  email: "info@reventos.feroferto.com",
  /** Where the company is based (footer line). */
  basedIn: "Athens, Greece",
} as const;

/** "Page name · Reventos" style titles. */
export const brandTitle = (page?: string) =>
  page ? `${page} · ${BRAND.name}` : `${BRAND.name} — ${BRAND.tagline}`;
