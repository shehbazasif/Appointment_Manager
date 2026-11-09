/** Shared helpers for the services (menu) API. */

export const serializeService = (s: any) => ({
  id: s.id,
  businessId: s.business_id,
  name: s.name,
  description: s.description ?? null,
  category: s.category || "General",
  durationMinutes: s.duration_minutes,
  priceCents: s.price != null ? Math.round(Number(s.price) * 100) : 0,
  currency: s.currency ?? "EUR",
  active: s.status === "ACTIVE",
  accent: s.accent ?? "#ca7481",
  createdAt: s.created_at,
  updatedAt: s.updated_at,
});

/**
 * True when Postgres says the `category` column does not exist yet
 * (scripts/service-categories.sql has not been run). Callers then retry the
 * write without the category so the rest keeps working.
 */
export const isMissingCategoryColumn = (error: any) =>
  !!error &&
  /category/i.test(String(error.message ?? "")) &&
  (error.code === "42703" || error.code === "PGRST204" || /column/i.test(String(error.message ?? "")));
