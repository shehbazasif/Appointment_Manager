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

/**
 * One account can belong to several businesses (its own and, say, a branch of
 * another company). Which one is open is kept on this device; the server only
 * accepts a business the person is a member of.
 */
const BUSINESS_KEY = "rv_business";

export function getSelectedBusiness(): string | null {
  try {
    return localStorage.getItem(BUSINESS_KEY) || null;
  } catch {
    return null;
  }
}

/** Open another of my businesses (starts outside any branch). */
export function openBusiness(businessId: string, to = "/dashboard") {
  try {
    localStorage.setItem(BUSINESS_KEY, businessId);
    localStorage.removeItem(KEY);
  } catch {}
  window.location.href = to;
}

/** Remember a business without reloading (e.g. right after joining it). */
export function rememberBusiness(businessId: string | null) {
  try {
    if (businessId) localStorage.setItem(BUSINESS_KEY, businessId);
    else localStorage.removeItem(BUSINESS_KEY);
    localStorage.removeItem(KEY);
  } catch {}
}
