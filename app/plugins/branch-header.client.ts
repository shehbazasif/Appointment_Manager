/**
 * Branches: when a head-office member chose to work inside a branch, every
 * /api call says which branch (X-Branch-Id). The server only accepts it when
 * the branch belongs to the person's head office; branch members are never
 * affected. Runs before login-code-guard (alphabetical), after api-base (app).
 */
const BRANCH_KEY = "rv_branch";

export default defineNuxtPlugin(() => {
  const previous = globalThis.$fetch;
  const withBranch = ((request: any, options: any = {}) => {
    let branch = "";
    try {
      branch = localStorage.getItem(BRANCH_KEY) ?? "";
    } catch {}
    const url = typeof request === "string" ? request : String(request?.url ?? "");
    if (branch && url.includes("/api/") && !url.includes("/api/admin")) {
      const headers = new Headers(options.headers as HeadersInit);
      if (!headers.has("X-Branch-Id")) headers.set("X-Branch-Id", branch);
      options = { ...options, headers };
    }
    return previous(request, options);
  }) as typeof $fetch;
  Object.assign(withBranch, previous);
  globalThis.$fetch = withBranch;
});
