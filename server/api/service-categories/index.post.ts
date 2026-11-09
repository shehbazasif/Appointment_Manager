import { readValidatedBody } from "h3";
import { z } from "zod";
import { requireTenant } from "../../utils/auth";
import { getUserClient } from "../../utils/supabase";
import { categoriesNotReady, loadCategoryNames } from "../../utils/service-categories";

const bodySchema = z.object({ name: z.string().trim().min(1).max(60) });

export default defineEventHandler(async (event) => {
  const { businessId } = await requireTenant(event);
  const { name } = await readValidatedBody(event, bodySchema.parse);
  const sb = await getUserClient(event);

  const { ready, saved, names } = await loadCategoryNames(sb, businessId);
  if (!ready) throw categoriesNotReady();
  if (names.some((n) => n.toLowerCase() === name.toLowerCase()))
    return { enabled: true, categories: names };

  const { error } = await sb
    .from("business_settings")
    .upsert(
      { business_id: businessId, service_categories: [...saved, name], updated_at: new Date().toISOString() },
      { onConflict: "business_id" },
    );
  if (error) throw createError({ statusCode: 500, statusMessage: error.message });

  return { enabled: true, categories: (await loadCategoryNames(sb, businessId)).names };
});
