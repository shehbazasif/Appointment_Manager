import { requireTenant } from "../../utils/auth";
import { getUserClient } from "../../utils/supabase";
import { loadCategoryNames } from "../../utils/service-categories";

export default defineEventHandler(async (event) => {
  const { businessId } = await requireTenant(event);
  const sb = await getUserClient(event);
  const { ready, names } = await loadCategoryNames(sb, businessId);
  return { enabled: ready, categories: names };
});
