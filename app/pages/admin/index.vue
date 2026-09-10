<script setup lang="ts">
const session = ref<{
  user?: { email: string; firstName: string };
  organization?: { name: string };
  role?: string;
} | null>(null);
const denied = ref(false);
onMounted(async () => {
  try {
    session.value = await $fetch("/api/me");
    denied.value = session.value.role !== "SUPER_ADMIN";
  } catch {
    await navigateTo("/login");
  }
});
</script>
<template>
  <main class="min-h-screen bg-[#17181c] px-5 py-10 text-white lg:px-10">
    <div class="mx-auto max-w-6xl">
      <div class="flex items-end justify-between">
        <div>
          <p class="text-xs font-bold uppercase tracking-[1.3px] text-rose-300">
            Restricted platform console
          </p>
          <h1 class="mt-2 font-display text-5xl">Admin control room</h1>
        </div>
        <NuxtLink
          to="/logout"
          class="rounded-lg border border-white/15 px-4 py-2 text-sm"
          >Sign out</NuxtLink
        >
      </div>
      <section
        v-if="denied"
        class="mt-10 rounded-xl border border-rose-400/30 bg-rose-500/10 p-5 text-sm text-rose-200"
      >
        This area is restricted to platform administrators.
      </section>
      <div v-else class="mt-10 grid gap-4 sm:grid-cols-3">
        <article
          v-for="item in ['Businesses', 'System health', 'Audit activity']"
          :key="item"
          class="rounded-xl border border-white/10 bg-white/5 p-5"
        >
          <p class="text-sm text-white/55">{{ item }}</p>
          <strong class="mt-3 block text-3xl">--</strong
          ><span class="mt-2 block text-xs text-white/45"
            >Connect this view to platform data.</span
          >
        </article>
      </div>
    </div>
  </main>
</template>
