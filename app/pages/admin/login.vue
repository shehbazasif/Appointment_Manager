<script setup lang="ts">
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Password from "primevue/password";

const { supabase, refreshUser } = useSupabaseAuth();
const email = ref("");
const password = ref("");
const errorMessage = ref("");
const loading = ref(false);

const signIn = async () => {
  loading.value = true;
  errorMessage.value = "";
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.value.trim(),
      password: password.value,
    });
    if (error) throw error;
    const user = await refreshUser();
    const meta = (user as any)?.app_metadata ?? {};
    const userMeta = (user as any)?.user_metadata ?? {};
    if (meta.platform_role !== "SUPER_ADMIN" && userMeta.platform_role !== "SUPER_ADMIN") {
      await supabase.auth.signOut();
      throw new Error("This account does not have platform admin access. Set app_metadata.platform_role = 'SUPER_ADMIN' on your user in Supabase → Auth → Users first.");
    }
    await navigateTo("/admin");
  } catch (error: any) {
    errorMessage.value = error?.message ?? "Unable to authenticate.";
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

      <!-- Sign In Form -->
      <form class="mt-8 space-y-5" @submit.prevent="signIn">
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
          label="Sign in"
          severity="contrast"
          :loading="loading"
          class="!mt-7 !w-full !py-3 !font-semibold !rounded-lg transition-transform active:scale-[0.99]"
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
