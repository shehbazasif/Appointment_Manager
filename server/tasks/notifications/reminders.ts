import { createClient } from "@supabase/supabase-js";
import { processDueReminders } from "../../services/notifications";

/**
 * Reminder worker — runs automatically every 5 minutes via Nitro's
 * `scheduledTasks` (see nuxt.config.ts), so reminders are fully automatic
 * with no external cron service needed. Can also be triggered manually:
 *   curl "http://localhost:3000/api/__tasks/notifications:reminders"
 *
 * The sweep runs through secret-gated SECURITY DEFINER RPCs
 * (claim_due_reminders / complete_reminder) — no service_role key, and
 * callers without CRON_SECRET get nothing back.
 */
export default defineTask({
  meta: { name: "notifications:reminders", description: "Send due appointment reminder emails" },
  async run() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_KEY;
    const secret = process.env.CRON_SECRET ?? "";
    if (!url || !key || !secret)
      return { result: { skipped: "SUPABASE_URL/SUPABASE_KEY/CRON_SECRET not configured" } };

    const sb = createClient(url, key, { auth: { persistSession: false } });
    const summary = await processDueReminders(sb, { secret });
    if (summary.claimed > 0)
      console.log(
        `[reminders] claimed=${summary.claimed} sent=${summary.sent} failed=${summary.failed}`,
        summary.errors.length ? summary.errors : "",
      );
    return { result: summary };
  },
});
