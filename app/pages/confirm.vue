<script setup lang="ts">
// Landing page for links in Supabase emails (sign-up confirmation, email
// change). Two link styles:
//  - ?token_hash=…&type=…  (our email templates) — works in ANY browser/phone
//  - ?code=…               (older style) — only in the browser that started it
const supabase = useSupabaseClient();
const failed = ref(false);

onMounted(async () => {
  const url = new URL(window.location.href);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") ?? "email";

  if (tokenHash && type === "recovery") {
    // a password-reset link sent here by mistake: the reset page handles it
    return navigateTo(`/reset-password${url.search}`, { replace: true });
  }

  if (tokenHash) {
    const allowed = ["email", "signup", "email_change", "invite", "magiclink"] as const;
    const otpType = (allowed as readonly string[]).includes(type) ? (type as (typeof allowed)[number]) : "email";
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: otpType });
    if (error) {
      failed.value = true;
      window.history.replaceState(null, "", "/confirm");
      return;
    }
  } else if (url.searchParams.get("code")) {
    // supabase-js may have already used the code (detectSessionInUrl)
    await supabase.auth.exchangeCodeForSession(window.location.href).catch(() => null);
  }
  // Hash-based (implicit) links are picked up automatically by supabase-js.
  const { data } = await supabase.auth.getSession();
  await navigateTo(data.session ? "/dashboard" : "/login", { replace: true });
});
</script>

<template>
  <main class="grid min-h-screen place-items-center bg-paper px-5 text-center text-sm text-stone-500">
    <div v-if="failed" class="max-w-sm space-y-3">
      <p class="text-base font-semibold text-stone-900">This link has expired or was already used.</p>
      <p>Sign in with your email and password. If your email is not confirmed yet, sign in and we will send a new link.</p>
      <NuxtLink to="/login" class="ui-btn ui-btn-primary">Go to sign in</NuxtLink>
    </div>
    <span v-else>Confirming your account...</span>
  </main>
</template>
