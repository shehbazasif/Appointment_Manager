/**
 * 2-step login safety net (website and Android app): whenever any API call says
 * "confirm the emailed code first" (403 LOGIN_CODE_REQUIRED), go to the code
 * page — e.g. after the person went Back from it or opened another tab.
 * Runs after api-base.client.ts (alphabetical), so it wraps the app's $fetch too.
 */
export default defineNuxtPlugin(() => {
  const router = useRouter();
  const previous = globalThis.$fetch;
  const guarded = (async (request: any, options?: any) => {
    try {
      return await previous(request, options);
    } catch (error: any) {
      const code = error?.data?.data?.code ?? error?.data?.code;
      if (code === "LOGIN_CODE_REQUIRED" && router.currentRoute.value.path !== "/verify-login") {
        navigateTo("/verify-login", { replace: true });
      }
      throw error;
    }
  }) as typeof $fetch;
  // keep $fetch.raw / $fetch.create / $fetch.native working
  Object.assign(guarded, previous);
  globalThis.$fetch = guarded;
});
