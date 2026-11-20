<script setup lang="ts">
// "Continue with Google". After Google, Supabase sends the person to /confirm,
// then to the dashboard (email code on a new device; first-timers name their
// business on /welcome). Hidden inside the Android app for now: Google sign-in
// there needs a deep link back into the app.
const { supabase } = useSupabaseAuth();
const loading = ref(false);
const error = ref("");
const inApp = computed(() => !!String((useRuntimeConfig().public as any).apiBase || ""));

const go = async () => {
  loading.value = true;
  error.value = "";
  try {
    const { error: e } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${getSiteOrigin()}/confirm`, queryParams: { prompt: "select_account" } },
    });
    if (e) throw e;
    // the browser now goes to Google
  } catch (e: any) {
    error.value = /not enabled|unsupported provider/i.test(e?.message ?? "")
      ? "Google sign-in is not switched on yet."
      : (e?.message ?? "Could not open Google sign-in.");
    loading.value = false;
  }
};
</script>

<template>
  <div v-if="!inApp">
    <button
      type="button"
      class="flex min-h-11 w-full items-center justify-center gap-3 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-800 transition hover:bg-stone-50 disabled:opacity-60"
      :disabled="loading"
      @click="go"
    >
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
        <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
        <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
        <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
      </svg>
      <span>{{ loading ? "Opening Google…" : "Continue with Google" }}</span>
    </button>
    <p v-if="error" class="mt-2 text-center text-xs font-medium text-rose-700">{{ error }}</p>
    <div class="my-5 flex items-center gap-3 text-xs text-stone-400">
      <span class="h-px flex-1 bg-stone-200"></span>
      or with email
      <span class="h-px flex-1 bg-stone-200"></span>
    </div>
  </div>
</template>
