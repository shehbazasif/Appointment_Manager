/** Category list = names saved in business_settings.service_categories + names used by services. */
export const loadCategoryNames = async (sb: any, businessId: string) => {
  const [{ data: settings, error: settingsError }, { data: services, error: servicesError }] =
    await Promise.all([
      sb.from("business_settings").select("service_categories").eq("business_id", businessId).maybeSingle(),
      sb.from("services").select("category").eq("business_id", businessId),
    ]);
  // Columns are missing until scripts/service-categories.sql is run
  const ready = !settingsError && !servicesError;
  const saved: string[] = ready ? ((settings as any)?.service_categories ?? []) : [];
  const used: string[] = ready ? (services ?? []).map((s: any) => s.category).filter(Boolean) : [];
  const names = Array.from(new Set(["General", ...saved, ...used].map((n) => n.trim()).filter(Boolean)));
  return { ready, saved, names: names.sort((a, b) => (a === "General" ? -1 : b === "General" ? 1 : a.localeCompare(b))) };
};

export const categoriesNotReady = () =>
  createError({
    statusCode: 503,
    statusMessage: "Service categories are not enabled in the database yet (run scripts/service-categories.sql).",
  });
