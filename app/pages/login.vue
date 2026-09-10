<script setup lang="ts">
import { ref, reactive, watch, onBeforeUnmount } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";

const form = reactive({
  email: "",
  password: "",
  code: "",
});

const errors = reactive({
  email: "",
  password: "",
  code: "",
});

const touched = reactive({
  email: false,
  password: false,
  code: false,
});

const challengeId = ref("");
const expiresAt = ref(0);
const previewCode = ref("");
const secondsLeft = ref(0);
const loading = ref(false);
const errorMessage = ref("");
const showPassword = ref(false);

const validateField = (field: keyof typeof form) => {
  touched[field] = true;
  const val = form[field]?.trim() ?? "";

  if (!val) {
    errors[field] = "This field is required.";
    return false;
  }

  if (field === "email") {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(val)) {
      errors[field] = "Please enter a valid email address.";
      return false;
    }
  }

  if (field === "code" && val.length !== 6) {
    errors[field] = "Code must be exactly 6 digits.";
    return false;
  }

  errors[field] = "";
  return true;
};

const validateStep1 = () => {
  const isEmailValid = validateField("email");
  const isPasswordValid = validateField("password");
  return isEmailValid && isPasswordValid;
};

const login = async () => {
  if (!validateStep1()) return;

  loading.value = true;
  errorMessage.value = "";
  try {
    const result = await $fetch<{
      challengeId: string;
      expiresAt: string;
      previewCode?: string;
    }>("/api/auth/request-code", {
      method: "POST",
      body: { email: form.email, password: form.password },
    });
    challengeId.value = result.challengeId;
    expiresAt.value = new Date(result.expiresAt).getTime();
    previewCode.value = result.previewCode ?? "";
    secondsLeft.value = 60;
  } catch (error: any) {
    errorMessage.value =
      error?.data?.statusMessage ?? "Unable to sign in. Check your details.";
  } finally {
    loading.value = false;
  }
};

const verify = async () => {
  if (!validateField("code")) return;

  loading.value = true;
  errorMessage.value = "";
  try {
    await $fetch("/api/auth/verify-code", {
      method: "POST",
      body: { challengeId: challengeId.value, code: form.code },
    });
    await navigateTo("/dashboard");
  } catch (error: any) {
    errorMessage.value =
      error?.data?.statusMessage ?? "Unable to verify the code.";
  } finally {
    loading.value = false;
  }
};

let timer: ReturnType<typeof setInterval> | undefined;
onBeforeUnmount(() => {
  if (timer) clearInterval(timer);
});

watch(challengeId, (value) => {
  if (!value) return;
  timer = setInterval(() => {
    secondsLeft.value = Math.max(
      0,
      Math.ceil((expiresAt.value - Date.now()) / 1000),
    );
    if (!secondsLeft.value && timer) clearInterval(timer);
  }, 250);
});
</script>

<template>
  <main
    class="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_80%_0%,#f8eee9_0,transparent_32rem),#fbfaf8] px-5 py-12"
  >
    <section
      class="surface w-full max-w-md rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xl shadow-stone-900/5 sm:p-8"
    >
      <!-- Brand Header -->
      <NuxtLink
        to="/"
        class="inline-flex items-center gap-2.5 text-lg font-bold tracking-tight text-stone-900"
      >
        <span
          class="grid size-8 place-items-center rounded-lg bg-ink text-sm font-black text-white shadow-sm"
        >
          R
        </span>
        <span>rantevou<span class="text-rose">OS</span></span>
      </NuxtLink>

      <!-- Section Title -->
      <div class="mt-8">
        <p
          class="eyebrow text-xs font-semibold uppercase tracking-wider text-rose"
        >
          Welcome back
        </p>
        <h1
          class="mt-1 font-display text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl"
        >
          Sign in to your Business account.
        </h1>
        <p class="mt-2 text-sm text-stone-500">
          Use your owner, manager, staff, or admin account.
        </p>
      </div>

      <!-- Step 1: Login Form -->
      <form
        v-if="!challengeId"
        class="mt-7 space-y-4"
        novalidate
        @submit.prevent="login"
      >
        <!-- Email Field -->
        <div class="space-y-1.5">
          <label
            for="login-email"
            class="block text-xs font-bold uppercase tracking-wider text-stone-600"
          >
            Email address
          </label>
          <InputText
            id="login-email"
            v-model="form.email"
            type="email"
            autocomplete="email"
            placeholder="you@example.com"
            :class="[
              'w-full !rounded-xl !border !px-3.5 !py-2.5 !text-stone-900 placeholder:!text-stone-400 focus:!outline-none',
              errors.email
                ? '!border-rose-400 !bg-rose-50/20 focus:!border-rose-600 focus:!ring-1 focus:!ring-rose-600'
                : '!border-stone-300 !bg-stone-50/50 focus:!border-stone-900 focus:!bg-white focus:!ring-1 focus:!ring-stone-900',
            ]"
            @blur="validateField('email')"
          />
          <p v-if="errors.email" class="text-xs font-medium text-rose-600">
            {{ errors.email }}
          </p>
        </div>

        <!-- Password Field with Custom Eye Icon -->
        <div class="space-y-1.5">
          <label
            for="login-password"
            class="block text-xs font-bold uppercase tracking-wider text-stone-600"
          >
            Password
          </label>
          <div class="relative w-full">
            <input
              id="login-password"
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              placeholder="Your password"
              :class="[
                'w-full rounded-xl border px-3.5 py-2.5 pr-10 text-stone-900 placeholder-stone-400 focus:outline-none',
                errors.password
                  ? 'border-rose-400 bg-rose-50/20 focus:border-rose-600 focus:ring-1 focus:ring-rose-600'
                  : 'border-stone-300 bg-stone-50/50 focus:border-stone-900 focus:bg-white focus:ring-1 focus:ring-stone-900',
              ]"
              @blur="validateField('password')"
            />
            <button
              type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 focus:outline-none"
              aria-label="Toggle password visibility"
              @click="showPassword = !showPassword"
            >
              <svg
                v-if="!showPassword"
                class="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="1.75"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <svg
                v-else
                class="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="1.75"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                />
              </svg>
            </button>
          </div>
          <p v-if="errors.password" class="text-xs font-medium text-rose-600">
            {{ errors.password }}
          </p>
        </div>

        <!-- Global API Error -->
        <div
          v-if="errorMessage"
          class="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-medium text-rose-700"
        >
          {{ errorMessage }}
        </div>

        <Button
          type="submit"
          label="Sign in"
          icon="pi pi-arrow-right"
          iconPos="right"
          severity="contrast"
          :loading="loading"
          class="!mt-7 !w-full !justify-center !rounded-xl !bg-stone-900 !py-3 !font-semibold !text-white hover:!bg-stone-800 transition-all active:scale-[0.99]"
        />
      </form>

      <!-- Step 2: Verification Code Form -->
      <form v-else class="mt-7 space-y-4" novalidate @submit.prevent="verify">
        <div
          class="rounded-xl border border-teal-200 bg-teal-50 p-3.5 text-xs leading-relaxed text-teal-800"
        >
          A verification code was sent to
          <strong class="font-semibold text-stone-900">{{ form.email }}</strong
          >. It expires in
          <span class="font-mono font-bold">{{ secondsLeft }}s</span>.
        </div>

        <div
          v-if="previewCode"
          class="flex items-center justify-between rounded-xl border border-dashed border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-800"
        >
          <span>Development preview code:</span>
          <strong
            class="font-mono text-sm font-bold tracking-widest text-amber-900"
            >{{ previewCode }}</strong
          >
        </div>

        <div class="space-y-1.5">
          <label
            for="verification-code"
            class="block text-xs font-bold uppercase tracking-wider text-stone-600"
          >
            6-digit verification code
          </label>
          <InputText
            id="verification-code"
            v-model="form.code"
            inputmode="numeric"
            maxlength="6"
            placeholder="000000"
            :class="[
              'w-full text-center font-mono text-xl tracking-[0.5em] !rounded-xl !border !py-3 !text-stone-900 focus:!outline-none',
              errors.code
                ? '!border-rose-400 !bg-rose-50/20 focus:!border-rose-600 focus:!ring-1 focus:!ring-rose-600'
                : '!border-stone-300 !bg-stone-50/50 focus:!border-stone-900 focus:!bg-white focus:!ring-1 focus:!ring-stone-900',
            ]"
            @blur="validateField('code')"
          />
          <p
            v-if="errors.code"
            class="text-center text-xs font-medium text-rose-600"
          >
            {{ errors.code }}
          </p>
        </div>

        <div
          v-if="errorMessage"
          class="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-medium text-rose-700"
        >
          {{ errorMessage }}
        </div>

        <Button
          type="submit"
          label="Verify and continue"
          icon="pi pi-check"
          iconPos="right"
          severity="contrast"
          :loading="loading"
          class="!mt-7 !w-full !justify-center !rounded-xl !bg-stone-900 !py-3 !font-semibold !text-white hover:!bg-stone-800 transition-all active:scale-[0.99]"
        />
      </form>

      <!-- Footer Link -->
      <div
        class="mt-8 border-t border-stone-100 pt-6 text-center text-sm text-stone-500"
      >
        New business?
        <NuxtLink
          to="/register"
          class="font-semibold text-rose-600 hover:text-rose-700 hover:underline"
        >
          Create an account
        </NuxtLink>
      </div>
    </section>
  </main>
</template>
