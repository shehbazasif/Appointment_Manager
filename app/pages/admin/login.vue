<script setup lang="ts">
// Platform admin sign-in: password, then the authenticator app (required).
// Uses its own session (useAdminAuth), separate from the business login.
import { ShieldCheck, Loader2, AlertCircle, Eye, EyeOff, Smartphone, Copy, Check } from "lucide-vue-next";

definePageMeta({ layout: false });
useHead({ title: "Admin sign in" });
useBrandTheme(() => null);

const { init, signIn: adminSignIn, signOut, isAdminUser, mfaStep, startEnroll, verifyAppCode } = useAdminAuth();

type Step = "password" | "enroll" | "challenge";
const step = ref<Step>("password");
const email = ref("");
const password = ref("");
const showPassword = ref(false);
const code = ref("");
const enrollData = ref<{ factorId: string; qr: string; secret: string } | null>(null);
const copied = ref(false);
const errorMessage = ref("");
const loading = ref(false);

const goNext = async () => {
  const next = await mfaStep();
  if (next === "done") return navigateTo("/admin", { replace: true });
  step.value = next;
  code.value = "";
  if (next === "enroll") enrollData.value = await startEnroll();
};

onMounted(async () => {
  const u = await init();
  if (isAdminUser(u)) {
    try {
      await goNext();
    } catch (e: any) {
      errorMessage.value = e?.message ?? "Could not continue sign-in.";
    }
  }
});

const submitPassword = async () => {
  loading.value = true;
  errorMessage.value = "";
  try {
    await adminSignIn(email.value.trim(), password.value);
    password.value = "";
    await goNext();
  } catch (error: any) {
    errorMessage.value =
      error?.message === "Invalid login credentials" ? "Wrong email or password." : (error?.message ?? "Unable to sign in.");
  } finally {
    loading.value = false;
  }
};

const submitCode = async () => {
  if (!/^\d{6}$/.test(code.value)) {
    errorMessage.value = "Enter the 6-digit code from the app.";
    return;
  }
  loading.value = true;
  errorMessage.value = "";
  try {
    await verifyAppCode(code.value, step.value === "enroll" ? enrollData.value?.factorId : undefined);
    await navigateTo("/admin", { replace: true });
  } catch (e: any) {
    errorMessage.value = e?.message ?? "Wrong code.";
    code.value = "";
  } finally {
    loading.value = false;
  }
};

watch(code, (v) => {
  const d = v.replace(/\D/g, "").slice(0, 6);
  if (d !== v) code.value = d;
  else if (d.length === 6 && !loading.value) submitCode();
});

const copySecret = async () => {
  if (!enrollData.value) return;
  try {
    await navigator.clipboard.writeText(enrollData.value.secret);
    copied.value = true;
    setTimeout(() => (copied.value = false), 1500);
  } catch {}
};

const startOver = async () => {
  await signOut();
  step.value = "password";
  enrollData.value = null;
  errorMessage.value = "";
};
</script>

<template>
  <main class="grid min-h-dvh place-items-center bg-[#f5f7fa] px-4 py-12 text-[#111827]">
    <section class="ds-card w-full max-w-sm p-6 sm:p-8">
      <span class="grid size-11 place-items-center rounded-lg bg-rose-600 text-white">
        <ShieldCheck v-if="step === 'password'" :size="22" />
        <Smartphone v-else :size="22" />
      </span>

      <!-- 1. Password -->
      <template v-if="step === 'password'">
        <h1 class="mt-4 text-xl font-bold">Platform admin</h1>
        <p class="mt-1 text-[13px] text-stone-600">
          Sign in with the admin account. This is separate from your business login — both can stay signed in.
        </p>
        <form class="mt-6 space-y-4" @submit.prevent="submitPassword">
          <div>
            <label for="admin-email" class="ds-label">Email</label>
            <input id="admin-email" v-model="email" type="email" autocomplete="username" required class="w-full px-3" />
          </div>
          <div>
            <label for="admin-password" class="ds-label">Password</label>
            <div class="relative">
              <input
                id="admin-password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                required
                class="w-full ps-3 pe-11"
              />
              <button
                type="button"
                class="absolute end-1 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded text-stone-500 hover:text-stone-900"
                :aria-label="showPassword ? 'Hide password' : 'Show password'"
                @click="showPassword = !showPassword"
              >
                <EyeOff v-if="showPassword" :size="16" />
                <Eye v-else :size="16" />
              </button>
            </div>
          </div>
          <p v-if="errorMessage" class="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-[13px] text-red-700">
            <AlertCircle :size="16" class="mt-0.5 shrink-0" /><span>{{ errorMessage }}</span>
          </p>
          <button type="submit" class="ui-btn ui-btn-primary w-full" :disabled="loading">
            <Loader2 v-if="loading" :size="16" class="animate-spin" />
            <span>Continue</span>
          </button>
        </form>
      </template>

      <!-- 2a. First-time setup -->
      <template v-else-if="step === 'enroll'">
        <h1 class="mt-4 text-xl font-bold">Set up the authenticator app</h1>
        <ol class="mt-2 list-decimal space-y-1 ps-5 text-[13px] text-stone-600">
          <li>Install <b>Google Authenticator</b> or <b>Microsoft Authenticator</b> on your phone.</li>
          <li>In the app tap <b>+</b> and scan this QR code.</li>
          <li>Type the 6-digit code the app shows.</li>
        </ol>
        <div class="mt-4 grid place-items-center rounded-lg border border-stone-200 bg-white p-3">
          <img v-if="enrollData" :src="enrollData.qr" alt="QR code for the authenticator app" class="size-44" />
          <Loader2 v-else :size="24" class="my-16 animate-spin text-stone-400" />
        </div>
        <div v-if="enrollData" class="mt-2 flex items-center gap-2 rounded-md bg-stone-50 px-2 py-1.5">
          <code class="min-w-0 flex-1 truncate text-xs text-stone-600">{{ enrollData.secret }}</code>
          <button type="button" class="ui-btn ui-btn-ghost ui-btn-sm" @click="copySecret">
            <Check v-if="copied" :size="14" /><Copy v-else :size="14" />
            {{ copied ? "Copied" : "Copy key" }}
          </button>
        </div>
        <p class="mt-1 text-xs text-stone-500">Can't scan? Choose "Enter a setup key" in the app and paste this key.</p>
      </template>

      <!-- 2b. Code from the app -->
      <template v-else>
        <h1 class="mt-4 text-xl font-bold">Enter the app code</h1>
        <p class="mt-1 text-[13px] text-stone-600">Open your authenticator app and type the 6-digit code for {{ BRAND.name }}.</p>
      </template>

      <form v-if="step !== 'password'" class="mt-5 space-y-4" @submit.prevent="submitCode">
        <div>
          <label for="admin-code" class="ds-label">6-digit code</label>
          <input
            id="admin-code"
            v-model="code"
            inputmode="numeric"
            autocomplete="one-time-code"
            maxlength="6"
            placeholder="••••••"
            class="w-full text-center text-xl font-bold tracking-[0.5em]"
            :disabled="loading"
          />
        </div>
        <p v-if="errorMessage" class="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-[13px] text-red-700">
          <AlertCircle :size="16" class="mt-0.5 shrink-0" /><span>{{ errorMessage }}</span>
        </p>
        <button type="submit" class="ui-btn ui-btn-primary w-full" :disabled="loading || code.length !== 6">
          <Loader2 v-if="loading" :size="16" class="animate-spin" />
          <span>{{ step === "enroll" ? "Finish setup" : "Sign in" }}</span>
        </button>
        <button type="button" class="ui-btn ui-btn-ghost w-full" @click="startOver">Use a different account</button>
      </form>

      <div class="mt-6 border-t border-stone-200 pt-4 text-center">
        <NuxtLink to="/login" class="text-[13px] font-medium text-stone-500 hover:text-stone-900">Business login →</NuxtLink>
      </div>
    </section>
  </main>
</template>
