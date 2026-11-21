/**
 * Safety net for "reset your password" emails: wherever the link lands (e.g.
 * the home page — Supabase sends there when the requested address is not in
 * its allowed list, and "Send password recovery" in the Supabase dashboard
 * always does), take the person to the page where they choose the new password.
 *
 * Handles both link styles:
 *  - ?code=…            (sign-in started by this website)
 *  - #access_token=…    (links made elsewhere, e.g. the Supabase dashboard)
 */
export default defineNuxtPlugin(() => {
  const supabase = useSupabaseClient();
  const router = useRouter();

  const goIfRecovery = async () => {
    const { data } = await supabase.auth.getSession();
    if (!isRecoveryLogin(data.session?.access_token)) return;
    if (router.currentRoute.value.path === "/reset-password") return;
    navigateTo("/reset-password", { replace: true });
  };

  const takeTokensFromLink = async () => {
    const url = new URL(window.location.href);
    const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
    try {
      if (hash.get("access_token") && hash.get("refresh_token")) {
        // dashboard-style link: open the session from the link, then clean the address bar
        await supabase.auth.setSession({
          access_token: hash.get("access_token")!,
          refresh_token: hash.get("refresh_token")!,
        });
        window.history.replaceState(null, "", url.pathname + url.search);
      } else if (url.searchParams.get("code") && url.pathname !== "/confirm" && url.pathname !== "/reset-password") {
        // website-style link that landed on another page
        const { data } = await supabase.auth.getSession();
        if (!data.session) await supabase.auth.exchangeCodeForSession(window.location.href).catch(() => null);
      }
    } catch {
      // a used or expired link: the normal pages handle it
    }
  };

  supabase.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setTimeout(goIfRecovery, 0);
  });
  router.isReady().then(async () => {
    await takeTokensFromLink();
    await goIfRecovery();
  });
});
