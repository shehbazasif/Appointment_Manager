import { getQuery } from "h3";
import { requireTenant } from "../../utils/auth";
import { getUserClient } from "../../utils/supabase";
import { categoriesNotReady, loadCategoryNames } from "../../utils/service-categories";

/** Removes a category. Its services are moved to "General" (they are not deleted). */
export default defineEventHandler(async (event) => {
  const { businessId } = await requireTenant(event);
  const name = String(getQuery(event).name ?? "").trim();
  if (!name) throw createError({ statusCode: 400, statusMessage: "Category name is required." });
  if (name.toLowerCase() === "general")
    throw createError({ statusCode: 400, statusMessage: "The General category can't be removed." });

  const sb = await getUserClient(event);
  const { ready, saved } = await loadCategoryNames(sb, businessId);
  if (!ready) throw categoriesNotReady();

  const { error: moveError } = await sb
    .from("services")
    .update({ category: "General", updated_at: new Date().toISOString() })
    .eq("business_id", businessId)
    .eq("category", name);
  if (moveError) throw createError({ statusCode: 500, statusMessage: moveError.message });

  const { error } = await sb
    .from("business_settings")
    .upsert(
      {
        business_id: businessId,
        service_categories: saved.filter((n) => n.toLowerCase() !== name.toLowerCase()),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "business_id" },
    );
  if (error) throw createError({ statusCode: 500, statusMessage: error.message });

  return { enabled: true, categories: (await loadCategoryNames(sb, businessId)).names };
});
