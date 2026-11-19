<script setup lang="ts">
// 2-step login for business users: confirm the 6-digit code from the email.
// Shown after sign-in on a new browser, or after 2 days away.
import { MailCheck, Loader2, AlertCircle, RotateCw } from "lucide-vue-next";

definePageMeta({ layout: false });
const { t } = useT();
useLocaleHead();
useHead({ title: () => t("Confirm it's you") });
useBrandTheme(() => null);

const { user, signOut } = useSupabaseAuth();
const code = ref("");
const sentTo = ref("");
const sending = ref(false);
const verifying = ref(false);
const error = ref("");
const cooldown = ref(0);
let timer: ReturnType<typeof setInterval> | null = null;

const startCooldown = (s = 60) => {
  cooldown.value = s;
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    cooldown.value = Math.max(0, cooldown.value - 1);
    if (!cooldown.value && timer) clearInterval(timer);
  }, 1000);
};

const sendCode = async () => {
  sending.value = true;
  error.value = "";
  try {
    const r = await $fetch<{ sentTo: string }>("/api/auth/login-code/request", { method: "POST" });
    sentTo.value = r.sentTo;
    try {
      sessionStorage.setItem("rv_login_code_sent", String(Date.now()));
      sessionStorage.setItem("rv_login_code_to", r.sentTo);
    } catch {}
    startCooldown();
  } catch (e: any) {
    error.value = e?.data?.statusMessage ?? t("Could not send the code. Try again in a minute.");
  } finally {
    sending.value = false;
  }
};

const verify = async () => {
  if (!/^\d{6}$/.test(code.value.trim())) {
    error.value = t("Enter the 6-digit code.");
    return;
  }
  verifying.value = true;
  error.value = "";
  try {
    const r = await $fetch<{ deviceToken?: string }>("/api/auth/login-code/verify", { method: "POST", body: { code: code.value.trim() } });
    // Android app only: it keeps the trusted-device value itself (no cookies there)
    if (r?.deviceToken) {
      try {
        localStorage.setItem("rv_device_trust", r.deviceToken);
      } catch {}
    }
    try {
      sessionStorage.removeItem("rv_login_code_sent");
    } catch {}
    await navigateTo("/dashboard", { replace: true });
  } catch (e: any) {
    error.value = e?.data?.statusMessage ?? t("Wrong or expired code.");
    code.value = "";
  } finally {
    verifying.value = false;
  }
};

const useOtherAccount = async () => {
  await signOut();
  await navigateTo("/login");
};

onMounted(async () => {
  if (!user.value) return navigateTo("/login");
  // already trusted? go straight in
  try {
    const me = await $fetch<{ loginCodeRequired?: boolean }>("/api/me");
    if (!me.loginCodeRequired) return navigateTo("/dashboard", { replace: true });
  } catch {}
  // don't send a new code on every refresh: reuse one sent in the last minute
  let recent = 0;
  try {
    recent = Date.now() - Number(sessionStorage.getItem("rv_login_code_sent") ?? 0);
    sentTo.value = sessionStorage.getItem("rv_login_code_to") ?? "";
  } catch {}
  if (recent < 60_000 && sentTo.value) startCooldown(Math.ceil((60_000 - recent) / 1000));
  else if (!(window as any).__rvLoginCodeAutoSent) {
    // only one automatic email per page load (the page can mount twice)
    (window as any).__rvLoginCodeAutoSent = true;
    await sendCode();
  }
});
onBeforeUnmount(() => timer && clearInterval(timer));

// auto-submit when 6 digits are typed or pasted
watch(code, (v) => {
  const digits = v.replace(/\D/g, "").slice(0, 6);
  if (digits !== v) code.value = digits;
  else if (digits.length === 6 && !verifying.value) verify();
});
</script>

<template>
  <main class="grid min-h-dvh place-items-center bg-[#f5f7fa] px-4 py-12 text-[#111827]">
    <section class="ds-card w-full max-w-sm p-6 sm:p-8">
      <span class="grid size-11 place-items-center rounded-lg bg-rose-50 text-rose-700">
        <MailCheck :size="22" />
      </span>
      <h1 class="mt-4 text-xl font-bold">{{ t("Confirm it's you") }}</h1>
      <p class="mt-1 text-[13px] text-stone-600">
        <template v-if="sentTo">{{ t("We emailed a 6-digit code to {email}. It expires in 15 minutes.", { email: sentTo }) }}</template>
        <template v-else>{{ t("We are sending a 6-digit code to your email…") }}</template>
      </p>
      <p class="mt-1 text-xs text-stone-500">{{ t("We ask for this on a new device or when you have been away for 2 days.") }}</p>

      <form class="mt-6 space-y-4" @submit.prevent="verify">
        <div>
          <label for="login-code" class="ds-label">{{ t("Code") }}</label>
          <input
            id="login-code"
            v-model="code"
            inputmode="numeric"
            autocomplete="one-time-code"
            maxlength="6"
            placeholder="••••••"
            class="w-full text-center text-xl font-bold tracking-[0.5em]"
            :disabled="verifying"
          />
        </div>
        <p v-if="error" class="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-[13px] text-red-700">
          <AlertCircle :size="16" class="mt-0.5 shrink-0" />
          <span>{{ error }}</span>
        </p>
        <button type="submit" class="ui-btn ui-btn-primary w-full" :disabled="verifying || code.length !== 6">
          <Loader2 v-if="verifying" :size="16" class="animate-spin" />
          <span>{{ t("Confirm") }}</span>
        </button>
        <button type="button" class="ui-btn ui-btn-ghost w-full" :disabled="sending || cooldown > 0" @click="sendCode">
          <Loader2 v-if="sending" :size="16" class="animate-spin" />
          <RotateCw v-else :size="16" />
          <span>{{ cooldown > 0 ? t("Send a new code in {s}s", { s: cooldown }) : t("Send a new code") }}</span>
        </button>
      </form>

      <div class="mt-6 border-t border-stone-200 pt-4 text-center">
        <button type="button" class="text-[13px] font-medium text-stone-500 hover:text-stone-900" @click="useOtherAccount">
          {{ t("Use a different account") }}
        </button>
      </div>
    </section>
  </main>
</template>
