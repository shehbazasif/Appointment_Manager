/** Queue token helpers (token numbers are assigned by the database per day). */

/** 7 -> "07", 123 -> "123" */
export const formatToken = (n: number | null | undefined) =>
  n == null ? "" : String(n).padStart(2, "0");

/**
 * Opens the printable token receipt (thermal printer friendly) in a small
 * window that prints itself. Falls back to the same tab when pop-ups are blocked.
 */
export function printToken(appointmentId: string) {
  if (!import.meta.client) return;
  const url = `/print/token/${appointmentId}?auto=1`;
  const w = window.open(url, "_blank", "width=420,height=720");
  if (!w) window.location.href = url;
}
