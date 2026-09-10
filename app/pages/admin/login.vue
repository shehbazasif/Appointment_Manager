<script setup lang="ts">
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Password from "primevue/password";
const email = ref("");
const password = ref("");
const code = ref("");
const challengeId = ref("");
const previewCode = ref("");
const errorMessage = ref("");
const loading = ref(false);
const request = async () => {
  loading.value = true;
  try {
    const result = await $fetch<any>("/api/auth/request-code", {
      method: "POST",
      body: { email: email.value, password: password.value },
    });
    challengeId.value = result.challengeId;
    previewCode.value = result.previewCode ?? "";
  } catch (error: any) {
    errorMessage.value =
      error?.data?.statusMessage ?? "Unable to authenticate.";
  } finally {
    loading.value = false;
  }
};
const verify = async () => {
  loading.value = true;
  try {
    await $fetch("/api/auth/verify-code", {
      method: "POST",
      body: { challengeId: challengeId.value, code: code.value },
    });
    const me = await $fetch<any>("/api/me");
    if (me.role !== "SUPER_ADMIN") throw new Error("Admin access required.");
    await navigateTo("/admin");
  } catch (error: any) {
    errorMessage.value =
      error?.data?.statusMessage ?? error.message ?? "Admin access denied.";
  } finally {
    loading.value = false;
  }
};
</script>
<template>
  <main
    class="relative grid min-h-screen place-items-center bg-[#17181c] px-4 py-12 text-white overflow-hidden selection:bg-rose-500/30"
  >
    <!-- Atmospheric Background Glow -->
    <div
      class="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-125 h-125 bg-rose-500/10 blur-[120px] rounded-full"
    ></div>

    <section
      class="relative w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-7 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-md sm:p-9"
    >
      <!-- Top Accent Line -->
      <div
        class="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-rose-400/40 to-transparent"
      ></div>

      <!-- Badge & Header -->
      <header class="space-y-3">
        <div
          class="inline-flex items-center gap-2 rounded-full border border-rose-300/20 bg-rose-300/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-rose-300"
        >
          <span class="relative flex h-2 w-2">
            <span
              class="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"
            ></span>
            <span
              class="relative inline-flex rounded-full h-2 w-2 bg-rose-400"
            ></span>
          </span>
          Restricted access
        </div>

        <h1
          class="font-display text-3xl font-bold tracking-tight text-white/95 sm:text-4xl"
        >
          Platform admin sign in.
        </h1>
      </header>

      <!-- Step 1: Request Code Form -->
      <form
        v-if="!challengeId"
        class="mt-8 space-y-5"
        @submit.prevent="request"
      >
        <div class="space-y-2">
          <label
            class="block text-xs font-semibold uppercase tracking-wider text-white/60"
          >
            Admin email
          </label>
          <InputText
            v-model="email"
            type="email"
            required
            class="w-full !bg-white/5 !border-white/10 !text-white placeholder:!text-white/20 focus:!border-rose-300/50 focus:!ring-1 focus:!ring-rose-300/50 !py-2.5 !px-3.5 !rounded-lg"
          />
        </div>

        <div class="space-y-2">
          <label
            class="block text-xs font-semibold uppercase tracking-wider text-white/60"
          >
            Password
          </label>
          <Password
            v-model="password"
            :feedback="false"
            toggle-mask
            required
            class="w-full"
            inputClass="w-full !bg-white/5 !border-white/10 !text-white placeholder:!text-white/20 focus:!border-rose-300/50 focus:!ring-1 focus:!ring-rose-300/50 !py-2.5 !px-3.5 !rounded-lg"
          />
        </div>

        <Button
          type="submit"
          label="Send verification code"
          severity="contrast"
          :loading="loading"
          class="!mt-7 !w-full !py-3 !font-semibold !rounded-lg transition-transform active:scale-[0.99]"
        />
      </form>

      <!-- Step 2: Verify Code Form -->
      <form v-else class="mt-8 space-y-5" @submit.prevent="verify">
        <p class="text-sm leading-relaxed text-white/70">
          Enter the six-digit code sent to your admin email.
        </p>

        <p
          v-if="previewCode"
          class="rounded-lg border border-amber-400/20 bg-amber-400/10 p-3.5 text-xs font-mono text-amber-200"
        >
          Development preview:
          <span class="font-bold tracking-widest text-amber-300">{{
            previewCode
          }}</span>
        </p>

        <div class="space-y-2">
          <InputText
            v-model="code"
            inputmode="numeric"
            maxlength="6"
            placeholder="000000"
            required
            class="w-full text-center font-mono text-2xl tracking-[0.75em] !bg-white/5 !border-white/10 !text-white placeholder:!text-white/20 focus:!border-rose-300/50 focus:!ring-1 focus:!ring-rose-300/50 !py-3 !rounded-lg"
          />
        </div>

        <Button
          type="submit"
          label="Enter admin console"
          severity="contrast"
          :loading="loading"
          class="!w-full !py-3 !font-semibold !rounded-lg transition-transform active:scale-[0.99]"
        />
      </form>

      <!-- Error State Banner -->
      <p
        v-if="errorMessage"
        class="mt-5 rounded-lg border border-rose-400/20 bg-rose-400/10 p-3.5 text-xs text-rose-200"
      >
        {{ errorMessage }}
      </p>

      <!-- Footer Action -->
      <div class="mt-8 border-t border-white/10 pt-5 text-center">
        <NuxtLink
          to="/login"
          class="inline-block text-xs font-medium text-white/40 transition-colors hover:text-white/80"
        >
          &larr; Switch to Business login
        </NuxtLink>
      </div>
    </section>
  </main>
</template>
