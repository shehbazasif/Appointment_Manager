/**
 * Branches: when a head-office member chose to work inside a branch, every
 * /api call says which branch (X-Branch-Id). The server only accepts it when
 * the branch belongs to the person's head office; branch members are never
 * affected. Runs before login-code-guard (alphabetical), after api-base (app).
 */
const BRANCH_KEY = "rv_branch";
// which of the person's businesses is open (several memberships)
const BUSINESS_KEY = "rv_business";

export default defineNuxtPlugin(() => {
  const previous = globalThis.$fetch;
  const withBranch = ((request: any, options: any = {}) => {
    let branch = "";
    let business = "";
    try {
      branch = localStorage.getItem(BRANCH_KEY) ?? "";
      business = localStorage.getItem(BUSINESS_KEY) ?? "";
    } catch {}
    const url = typeof request === "string" ? request : String(request?.url ?? "");
    if ((branch || business) && url.includes("/api/") && !url.includes("/api/admin")) {
      const headers = new Headers(options.headers as HeadersInit);
      if (branch && !headers.has("X-Branch-Id")) headers.set("X-Branch-Id", branch);
      if (business && !headers.has("X-Business-Id")) headers.set("X-Business-Id", business);
      options = { ...options, headers };
    }
    return previous(request, options);
  }) as typeof $fetch;
  Object.assign(withBranch, previous);
  globalThis.$fetch = withBranch;
});
