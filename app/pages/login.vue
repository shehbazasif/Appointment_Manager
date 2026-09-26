<script setup lang="ts">
import { reactive, ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";

const form = reactive({ email: "", password: "" });
const loading = ref(false);
const errorMessage = ref("");
const showPassword = ref(false);
const { supabase, user } = useSupabaseAuth();

// Already signed in? Go straight to the workspace.
watch(
  user,
  (currentUser) => {
    if (currentUser) navigateTo("/dashboard");
  },
  { immediate: true },
);

const login = async () => {
  loading.value = true;
  errorMessage.value = "";
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email.trim(),
      password: form.password,
    });
    if (error) throw error;
    // The dashboard self-heals provisioning when no business exists yet.
    await navigateTo("/dashboard");
  } catch (error: any) {
    errorMessage.value =
      error?.message ?? "Unable to sign in. Check your details.";
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <Navbar />
  <main class="grid min-h-screen place-items-center bg-paper px-5 py-12">
    <section
      class="surface w-full max-w-md rounded-2xl border border-stone-200 bg-white p-8 shadow-xl shadow-stone-900/5"
    >
      <p class="eyebrow text-rose">Welcome back</p>
      <h1 class="mt-1 font-display text-3xl text-stone-900">
        Sign in to your business.
      </h1>
      <p class="mt-2 text-sm text-stone-500">
        Use the email and password for your Supabase account.
      </p>

      <form class="mt-7 space-y-4" @submit.prevent="login">
        <div class="space-y-1.5">
          <label
            for="email"
            class="text-xs font-bold uppercase tracking-wider text-stone-600"
            >Email address</label
          >
          <InputText
            id="email"
            v-model="form.email"
            type="email"
            autocomplete="email"
            required
            class="w-full !rounded-xl !border !border-stone-300 !bg-stone-50/50 !px-3.5 !py-2.5"
          />
        </div>
        <div class="space-y-1.5">
          <label
            for="password"
            class="text-xs font-bold uppercase tracking-wider text-stone-600"
            >Password</label
          >
          <input
            id="password"
            v-model="form.password"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="current-password"
            required
            class="w-full rounded-xl border border-stone-300 bg-stone-50/50 px-3.5 py-2.5 pr-10"
          />
          <button
            type="button"
            class="text-xs font-semibold text-stone-500 hover:text-stone-900"
            @click="showPassword = !showPassword"
          >
            {{ showPassword ? "Hide password" : "Show password" }}
          </button>
        </div>
        <p
          v-if="errorMessage"
          class="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700"
        >
          {{ errorMessage }}
        </p>
        <Button
          type="submit"
          label="Sign in"
          severity="contrast"
          :loading="loading"
          class="!mt-5 !w-full !justify-center !rounded-xl !bg-stone-900 !py-3 !text-white"
        />
      </form>
      <p class="mt-7 border-t border-stone-100 pt-6 text-center text-sm text-stone-500">
        New business?
        <NuxtLink to="/register" class="font-semibold text-rose-600 hover:underline"
          >Create an account</NuxtLink
        >
      </p>
    </section>
  </main>
  <Footer />
</template>
