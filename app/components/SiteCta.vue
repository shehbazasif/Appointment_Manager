<script setup lang="ts">
import { ArrowRight, Check } from "lucide-vue-next";

withDefaults(defineProps<{ title?: string; text?: string }>(), {
  title: "Ready to fill your calendar?",
  text: "Set up your business in minutes and share your booking link today.",
});
</script>

<template>
  <section class="px-4 py-16 sm:px-6 lg:py-24">
    <div
      v-reveal
      class="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-stone-950 px-6 py-14 text-center shadow-2xl shadow-stone-900/20 sm:px-12 lg:py-20"
    >
      <div
        class="pointer-events-none absolute inset-0 bg-[radial-gradient(40rem_20rem_at_80%_0%,rgba(225,29,72,.35),transparent_60%),radial-gradient(30rem_18rem_at_0%_100%,rgba(244,114,182,.18),transparent_60%)]"
        aria-hidden="true"
      />
      <div class="relative">
        <h2 class="text-balance font-display text-3xl leading-tight text-white sm:text-5xl">{{ title }}</h2>
        <p class="mx-auto mt-4 max-w-xl text-base leading-7 text-stone-300 sm:text-lg">{{ text }}</p>
        <div class="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <NuxtLink
            to="/register"
            class="site-btn inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-rose-600 px-6 text-base font-semibold text-white shadow-lg shadow-rose-600/30 hover:bg-rose-500"
          >
            Start free trial <ArrowRight :size="18" />
          </NuxtLink>
          <NuxtLink
            to="/contactus"
            class="site-btn inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/20 px-6 text-base font-semibold text-white hover:bg-white/10"
          >
            Talk to us
          </NuxtLink>
        </div>
        <ul class="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-stone-300">
          <li v-for="t in [`${TRIAL_DAYS}-day free trial`, 'No card needed', 'Cancel any time']" :key="t" class="inline-flex items-center gap-1.5">
            <Check :size="16" class="text-rose-400" /> {{ t }}
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>
