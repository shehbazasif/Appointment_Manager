/**
 * Head office: which branch is open. null = the head office itself.
 * Switching reloads the dashboard so every screen shows the chosen branch.
 */
const KEY = "rv_branch";

export function getSelectedBranch(): string | null {
  try {
    return localStorage.getItem(KEY) || null;
  } catch {
    return null;
  }
}

export function openBranch(branchId: string | null, to = "/dashboard") {
  try {
    if (branchId) localStorage.setItem(KEY, branchId);
    else localStorage.removeItem(KEY);
  } catch {}
  window.location.href = to;
}

/** Forget a branch choice the server did not accept (e.g. not a head-office member). */
export function clearSelectedBranch() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
