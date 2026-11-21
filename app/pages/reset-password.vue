<script setup lang="ts">
// Step 2 of a password reset: opened from the emailed link. Supabase signs the
// person in for this one purpose; here they choose the new password.
import { Loader2, AlertCircle, Eye, EyeOff, CheckCircle2 } from "lucide-vue-next";

definePageMeta({ layout: "marketing" });
useHead({ title: `Choose a new password · ${BRAND.name}`, meta: [{ name: "robots", content: "noindex" }] });

const { supabase, signOut } = useSupabaseAuth();
const state = ref<"checking" | "ready" | "invalid" | "done">("checking");
const password = ref("");
const confirm = ref("");
const show = ref(false);
const saving = ref(false);
const errorMessage = ref("");

// Only a visit that comes from the emailed link may set a new password
// (an already signed-in person opening this page directly may not).
const fromEmailLink =
  import.meta.client && /[?&#](code|token_hash|access_token)=|type=recovery/.test(window.location.href);
let recoveryEvent = false;
if (import.meta.client) {
  supabase.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") recoveryEvent = true;
  });
}

const rules = computed(() => [
  { ok: password.value.length >= 8, text: "At least 8 characters" },
  { ok: /[a-z]/.test(password.value) && /[A-Z]/.test(password.value), text: "Upper and lower case letters" },
  { ok: /\d/.test(password.value), text: "At least one number" },
]);
const strongEnough = computed(() => rules.value.every((r) => r.ok));

onMounted(async () => {
  const url = window.location.href;
  const params = new URL(url).searchParams;
  const tokenHash = params.get("token_hash");
  if (tokenHash) {
    // Link from our email template: works in ANY browser or phone (e.g. the
    // Gmail app), because it does not need anything saved when the reset was asked.
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
    if (error) {
      state.value = "invalid";
      window.history.replaceState(null, "", "/reset-password");
      return;
    }
  } else if (url.includes("code=")) {
    // older style link: only works in the same browser that asked for the reset
    await supabase.auth.exchangeCodeForSession(url).catch(() => null);
  }
  if (/error_code=|error=/.test(url)) {
    state.value = "invalid";
    return;
  }
  const { data } = await supabase.auth.getSession();
  // from the email link: link parameters, Supabase's recovery event, or a
  // session that was opened by a reset link in the last hour
  const fromReset = fromEmailLink || recoveryEvent || isRecoveryLogin(data.session?.access_token);
  state.value = data.session && fromReset ? "ready" : "invalid";
  // remove the one-time code from the address bar
  window.history.replaceState(null, "", "/reset-password");
});

const save = async () => {
  errorMessage.value = "";
  if (!strongEnough.value) {
    errorMessage.value = "Choose a stronger password (see the list below).";
    return;
  }
  if (password.value !== confirm.value) {
    errorMessage.value = "The two passwords are not the same.";
    return;
  }
  saving.value = true;
  try {
    const { error } = await supabase.auth.updateUser({ password: password.value });
    if (error) throw error;
    password.value = confirm.value = "";
    // sign out everywhere else is handled by Supabase's session settings;
    // here we sign out so the person signs in fresh with the new password
    await signOut();
    state.value = "done";
  } catch (error: any) {
    const msg = String(error?.message ?? "");
    errorMessage.value = /same/i.test(msg)
      ? "The new password must be different from the old one."
      : /pwned|leaked|compromised|weak/i.test(msg)
        ? "This password appears in known data leaks. Please choose another one."
        : msg || "Could not save the new password.";
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <AuthShell>
    <section class="w-full rounded-[2rem] border border-stone-200 bg-white p-6 shadow-xl shadow-stone-900/5 sm:p-8">
      <div v-if="state === 'checking'" class="flex items-center justify-center gap-2 py-10 text-sm text-stone-500">
        <Loader2 :size="18" class="animate-spin" /> Checking your link…
      </div>

      <div v-else-if="state === 'invalid'" class="text-center">
        <span class="mx-auto grid size-12 place-items-center rounded-full bg-rose-50 text-rose-700"><AlertCircle :size="24" /></span>
        <h1 class="mt-4 font-display text-2xl text-stone-900">This link has expired</h1>
        <p class="mt-2 text-sm text-stone-500">Reset links work once and only for a short time. Ask for a new one.</p>
        <NuxtLink to="/forgot-password" class="ui-btn ui-btn-primary mt-5">Send a new link</NuxtLink>
      </div>

      <div v-else-if="state === 'done'" class="text-center">
        <span class="mx-auto grid size-12 place-items-center rounded-full bg-emerald-50 text-emerald-700"><CheckCircle2 :size="24" /></span>
        <h1 class="mt-4 font-display text-2xl text-stone-900">Password changed</h1>
        <p class="mt-2 text-sm text-stone-500">Sign in with your new password.</p>
        <NuxtLink to="/login" class="ui-btn ui-btn-primary mt-5">Sign in</NuxtLink>
      </div>

      <template v-else>
        <p class="eyebrow text-rose">Almost done</p>
        <h1 class="mt-1 font-display text-3xl text-stone-900">Choose a new password.</h1>

        <form class="mt-7 space-y-4" @submit.prevent="save">
          <div class="space-y-1.5">
            <label for="new-password" class="text-xs font-bold uppercase tracking-wider text-stone-600">New password</label>
            <div class="relative">
              <input
                id="new-password"
                v-model="password"
                :type="show ? 'text' : 'password'"
                autocomplete="new-password"
                required
                class="w-full rounded-xl border border-stone-300 bg-stone-50/50 py-2.5 ps-3.5 pe-11"
              />
              <button
                type="button"
                class="absolute end-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-stone-500 hover:text-stone-900"
                :aria-label="show ? 'Hide password' : 'Show password'"
                @click="show = !show"
              >
                <EyeOff v-if="show" :size="16" /><Eye v-else :size="16" />
              </button>
            </div>
            <ul class="grid gap-0.5 pt-1 text-xs">
              <li v-for="r in rules" :key="r.text" :class="r.ok ? 'text-emerald-700' : 'text-stone-500'">
                {{ r.ok ? "✓" : "•" }} {{ r.text }}
              </li>
            </ul>
          </div>
          <div class="space-y-1.5">
            <label for="confirm-password" class="text-xs font-bold uppercase tracking-wider text-stone-600">Type it again</label>
            <input
              id="confirm-password"
              v-model="confirm"
              :type="show ? 'text' : 'password'"
              autocomplete="new-password"
              required
              class="w-full rounded-xl border border-stone-300 bg-stone-50/50 px-3.5 py-2.5"
            />
          </div>
          <p v-if="errorMessage" class="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">
            <AlertCircle :size="15" class="mt-0.5 shrink-0" /> {{ errorMessage }}
          </p>
          <button type="submit" class="ui-btn ui-btn-primary !mt-5 w-full" :disabled="saving">
            <Loader2 v-if="saving" :size="16" class="animate-spin" />
            <span>Save new password</span>
          </button>
        </form>
      </template>
    </section>
  </AuthShell>
</template>
