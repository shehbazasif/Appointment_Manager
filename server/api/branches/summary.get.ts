import { getQuery } from "h3";
import { requireHeadOffice } from "../../utils/auth";
import { getUserClient } from "../../utils/supabase";
import { safeTimeZone, todayInZone, zonedToUtc } from "../../utils/tz";

/**
 * Head office only: numbers per branch (and in total) for today, this week or
 * this month, counted in the head office's time zone.
 */
export default defineEventHandler(async (event) => {
  const { homeBusiness, settings } = await requireHeadOffice(event);
  const period = String(getQuery(event).period ?? "today");
  const sb = await getUserClient(event);
  const head = homeBusiness as any;

  const { data: branches } = await sb
    .from("businesses")
    .select("id, name, city")
    .eq("parent_business_id", head.id)
    .order("created_at", { ascending: true });
  const all = [{ id: head.id, name: head.name, city: head.city ?? null, isHead: true }, ...(branches ?? []).map((b: any) => ({ ...b, isHead: false }))];

  // period in the head office's time zone
  const tz = safeTimeZone(settings?.timezone ?? head.timezone);
  const [y, m, d] = todayInZone(tz).split("-").map(Number) as [number, number, number];
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
  const startDay = period === "month" ? { y, m, d: 1 } : period === "week" ? { y, m, d: d - ((dow + 6) % 7) } : { y, m, d };
  const from = zonedToUtc(startDay.y, startDay.m, startDay.d, 0, tz);
  const to =
    period === "month"
      ? zonedToUtc(y, m + 1, 1, 0, tz)
      : period === "week"
        ? zonedToUtc(startDay.y, startDay.m, startDay.d + 7, 0, tz)
        : zonedToUtc(y, m, d + 1, 0, tz);

  const { data: rows, error } = await sb
    .from("appointments")
    .select("business_id, status, price, service:services(price)")
    .in("business_id", all.map((b) => b.id))
    .gte("start_at", from.toISOString())
    .lt("start_at", to.toISOString());
  if (error) throw createError({ statusCode: 500, statusMessage: error.message });

  const empty = () => ({ total: 0, completed: 0, open: 0, cancelled: 0, revenue: 0 });
  const per = new Map(all.map((b) => [b.id, empty()]));
  const totals = empty();
  for (const r of rows ?? []) {
    const s = per.get((r as any).business_id);
    if (!s) continue;
    const status = String((r as any).status ?? "").toUpperCase();
    // agreed price of the booking, else the service's price
    const price = Number((r as any).price ?? (r as any).service?.price ?? 0) || 0;
    for (const t of [s, totals]) {
      t.total++;
      if (status === "COMPLETED") {
        t.completed++;
        t.revenue += price;
      } else if (status === "CANCELLED" || status === "NO_SHOW") t.cancelled++;
      else t.open++;
    }
  }
  return {
    period,
    from: from.toISOString(),
    to: to.toISOString(),
    currency: settings?.currency ?? head.currency ?? null,
    totals,
    branches: all.map((b) => ({ ...b, ...per.get(b.id)! })),
  };
});
