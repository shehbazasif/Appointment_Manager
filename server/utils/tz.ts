/** Time-zone helpers (no libraries): turn "a wall-clock time in the business's time zone" into a real instant. */

export const safeTimeZone = (tz?: string | null) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz || "UTC" });
    return tz || "UTC";
  } catch {
    return "UTC";
  }
};

const offsetMs = (utcMs: number, tz: string) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(utcMs / 1000) * 1000;
};

/** y-m-d at `minutes` after local midnight, in time zone `tz` -> the real UTC instant. (d may overflow: d+1 is fine.) */
export const zonedToUtc = (y: number, m: number, d: number, minutes: number, tz: string) => {
  const guess = Date.UTC(y, m - 1, d, 0, minutes);
  let utc = guess - offsetMs(guess, tz);
  utc = guess - offsetMs(utc, tz);
  return new Date(utc);
};

/** Today's date (YYYY-MM-DD) in time zone `tz`. */
export const todayInZone = (tz: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
