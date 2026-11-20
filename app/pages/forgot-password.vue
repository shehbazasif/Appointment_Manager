<script setup lang="ts">
// Step 1 of a password reset: email a reset link to the account's address.
import { MailCheck, Loader2, AlertCircle } from "lucide-vue-next";

definePageMeta({ layout: "marketing" });
usePageSeo({ path: "/forgot-password", title: "Reset your password", description: `Reset the password of your ${BRAND.name} business account.` });

const { supabase } = useSupabaseAuth();
const route = useRoute();
const email = ref(String(route.query.email ?? ""));
const loading = ref(false);
const sent = ref(false);
const errorMessage = ref("");

// The link must open the live website, also when asked from inside the
// Android app (whose own address is a local one).
const siteOrigin = () => {
  const apiBase = String((useRuntimeConfig().public as any).apiBase || "").replace(/\/+$/, "");
  return apiBase || getSiteOrigin();
};

const send = async () => {
  loading.value = true;
  errorMessage.value = "";
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email.value.trim(), {
      redirectTo: `${siteOrigin()}/reset-password`,
    });
    // Too many requests is the only error worth showing; for anything else we
    // show the same message, so nobody can test which emails have an account.
    if (error && /rate|too many|seconds/i.test(error.message)) throw error;
    sent.value = true;
  } catch (error: any) {
    errorMessage.value = /rate|too many|seconds/i.test(error?.message ?? "")
      ? "Too many requests. Please wait a minute and try again."
      : "Could not send the email. Please try again.";
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <AuthShell>
    <section class="w-full rounded-[2rem] border border-stone-200 bg-white p-6 shadow-xl shadow-stone-900/5 sm:p-8">
      <template v-if="!sent">
        <p class="eyebrow text-rose">Forgot your password?</p>
        <h1 class="mt-1 font-display text-3xl text-stone-900">Reset your password.</h1>
        <p class="mt-2 text-sm text-stone-500">
          Enter the email you sign in with. We will send you a link to choose a new password.
        </p>

        <form class="mt-7 space-y-4" @submit.prevent="send">
          <div class="space-y-1.5">
            <label for="reset-email" class="text-xs font-bold uppercase tracking-wider text-stone-600">Email address</label>
            <input
              id="reset-email"
              v-model="email"
              type="email"
              autocomplete="email"
              required
              class="w-full rounded-xl border border-stone-300 bg-stone-50/50 px-3.5 py-2.5"
            />
          </div>
          <p v-if="errorMessage" class="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">
            <AlertCircle :size="15" class="mt-0.5 shrink-0" /> {{ errorMessage }}
          </p>
          <button type="submit" class="ui-btn ui-btn-primary !mt-5 w-full" :disabled="loading">
            <Loader2 v-if="loading" :size="16" class="animate-spin" />
            <span>Send reset link</span>
          </button>
        </form>
      </template>

      <div v-else class="text-center">
        <span class="mx-auto grid size-12 place-items-center rounded-full bg-emerald-50 text-emerald-700">
          <MailCheck :size="24" />
        </span>
        <h1 class="mt-4 font-display text-2xl text-stone-900">Check your email</h1>
        <p class="mt-2 text-sm text-stone-500">
          If an account exists for <b class="text-stone-800">{{ email }}</b>, we sent a link to reset the password.
          The link works once and expires after about an hour. Check the spam folder too.
        </p>
        <button type="button" class="ui-btn ui-btn-ghost mt-4" @click="sent = false">Use a different email</button>
      </div>

      <p class="mt-7 border-t border-stone-100 pt-6 text-center text-sm text-stone-500">
        Remembered it?
        <NuxtLink to="/login" class="font-semibold text-rose-600 hover:underline">Back to sign in</NuxtLink>
      </p>
    </section>
  </AuthShell>
</template>
