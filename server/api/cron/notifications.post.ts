import { createClient } from "@supabase/supabase-js";
import { processDueReminders } from "../../services/notifications";

/**
 * Manual/external trigger for the reminder worker — for Hostinger cron or
 * a one-off run without waiting for the 5-minute Nitro scheduler:
 *
 *   curl -X POST https://<host>/api/cron/notifications \
 *        -H "x-cron-secret: <CRON_SECRET>"
 *
 * The Nitro scheduled task runs the same sweep automatically; this endpoint
 * exists for hosts where background tasks are unavailable.
 */
export default defineEventHandler(async (event) => {
  const secret = getHeader(event, "x-cron-secret") ?? "";
  const expected = process.env.CRON_SECRET ?? "";
  if (!expected || secret !== expected) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized." });
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  if (!url || !key)
    throw createError({ statusCode: 503, statusMessage: "Supabase is not configured." });

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const summary = await processDueReminders(sb, { secret });
  return { ok: true, ...summary };
});
