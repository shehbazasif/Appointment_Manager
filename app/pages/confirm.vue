<script setup lang="ts">
const supabase = useSupabaseClient();

onMounted(async () => {
  const url = window.location.href;
  if (url.includes("code=")) {
    // supabase-js may have already consumed the code automatically
    // (detectSessionInUrl); only a missing session afterwards is a failure.
    await supabase.auth.exchangeCodeForSession(url).catch(() => null);
  }
  // Hash-based (implicit) links are picked up automatically by supabase-js.
  const { data } = await supabase.auth.getSession();
  await navigateTo(data.session ? "/dashboard" : "/login", { replace: true });
});
</script>

<template>
  <main
    class="grid min-h-screen place-items-center bg-paper px-5 text-sm text-stone-500"
  >
    Confirming your account...
  </main>
</template>
