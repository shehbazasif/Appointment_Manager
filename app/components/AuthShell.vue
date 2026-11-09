<script setup lang="ts">
import { Check, Star } from "lucide-vue-next";

/** Split layout for sign-in / sign-up: form on the left, visual on the right (desktop only). */
withDefaults(defineProps<{ wide?: boolean }>(), { wide: false });
const points = ["Online booking page in minutes", "Automatic reminders", "Works on iPhone, Android and computer"];
</script>

<template>
  <div class="relative grid min-h-[calc(100dvh-4rem)] lg:grid-cols-[1fr_1fr]">
    <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(40rem_22rem_at_20%_0%,#fbe3e7_0,transparent_60%)] lg:hidden" aria-hidden="true" />
    <div class="relative flex items-start justify-center px-4 py-10 sm:px-6 sm:py-14 lg:items-center">
      <div class="w-full" :class="wide ? 'max-w-lg' : 'max-w-md'">
        <slot />
      </div>
    </div>

    <aside class="relative hidden overflow-hidden bg-stone-950 lg:block" aria-hidden="true">
      <img src="/images/salon.webp" alt="" width="960" height="640" class="absolute inset-0 size-full object-cover opacity-45" />
      <div class="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/60 to-rose-950/30" />
      <div class="relative flex h-full flex-col justify-end p-12 xl:p-16">
        <div class="float-b mb-10 max-w-sm rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur-md">
          <div class="flex gap-0.5 text-amber-400">
            <Star v-for="n in 5" :key="n" :size="14" fill="currentColor" />
          </div>
          <p class="mt-3 text-[15px] leading-7 text-white">“Customers book while I work. My phone finally stopped ringing all day.”</p>
          <p class="mt-3 text-xs text-stone-300">Example quote — salon owner</p>
        </div>
        <h2 class="max-w-md font-display text-4xl leading-tight text-white">Your bookings, team and customers in one calm app.</h2>
        <ul class="mt-6 space-y-2.5">
          <li v-for="p in points" :key="p" class="flex items-center gap-2.5 text-stone-200">
            <span class="grid size-6 place-items-center rounded-full bg-rose-500/25 text-rose-200"><Check :size="14" /></span>
            {{ p }}
          </li>
        </ul>
      </div>
    </aside>
  </div>
</template>
