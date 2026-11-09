<script setup lang="ts">
import type { NuxtError } from "#app";
import { Home, ArrowLeft, RefreshCw, Compass, ServerCrash } from "lucide-vue-next";

const props = defineProps<{ error: NuxtError }>();
const is404 = computed(() => props.error?.statusCode === 404);

useHead({ title: is404.value ? brandTitle("Page not found") : brandTitle("Something went wrong") });
useSeoMeta({ robots: "noindex" });

const goHome = () => clearError({ redirect: "/" });
const retry = () => {
  if (import.meta.client) window.location.reload();
};
const goBack = () => {
  if (import.meta.client && window.history.length > 1) {
    clearError();
    window.history.back();
  } else goHome();
};
const suggestions = [
  { name: "Features", to: "/features" },
  { name: "Pricing", to: "/pricing" },
  { name: "Help", to: "/help" },
  { name: "Contact", to: "/contactus" },
];
</script>

<template>
  <div class="site-focus flex min-h-dvh flex-col bg-[#fbfaf8] text-stone-900">
    <Navbar />
    <main class="relative flex flex-1 items-center overflow-hidden px-4 py-20 sm:px-6">
      <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(50rem_26rem_at_80%_0%,#fbe3e7_0,transparent_60%)]" aria-hidden="true" />
      <div class="relative mx-auto max-w-xl text-center">
        <span class="float-a mx-auto grid size-20 place-items-center rounded-3xl bg-white text-rose-600 shadow-xl shadow-stone-900/10">
          <Compass v-if="is404" :size="36" />
          <ServerCrash v-else :size="36" />
        </span>
        <p class="mt-8 font-display text-7xl text-stone-900 sm:text-8xl">{{ error?.statusCode || 500 }}</p>
        <h1 class="mt-3 text-2xl font-bold text-stone-900 sm:text-3xl">
          {{ is404 ? "This page took the day off." : "Something went wrong on our side." }}
        </h1>
        <p class="mt-3 text-base leading-7 text-stone-600">
          {{
            is404
              ? "The page you're looking for doesn't exist or has moved. Let's get you back on schedule."
              : "We couldn't load this page. Please try again in a moment — if it keeps happening, let us know."
          }}
        </p>
        <div class="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button type="button" class="site-btn inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-rose-600 px-6 font-semibold text-white shadow-lg shadow-rose-600/25 hover:bg-rose-700" @click="goHome">
            <Home :size="18" /> Back to home
          </button>
          <button v-if="!is404" type="button" class="site-btn inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white px-6 font-semibold text-stone-900" @click="retry">
            <RefreshCw :size="18" /> Try again
          </button>
          <button v-else type="button" class="site-btn inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white px-6 font-semibold text-stone-900" @click="goBack">
            <ArrowLeft :size="18" /> Go back
          </button>
        </div>
        <nav v-if="is404" aria-label="Popular pages" class="mt-10">
          <p class="text-xs font-bold uppercase tracking-[0.16em] text-stone-400">Popular pages</p>
          <ul class="mt-3 flex flex-wrap justify-center gap-2">
            <li v-for="s in suggestions" :key="s.to">
              <NuxtLink :to="s.to" class="inline-flex min-h-11 items-center rounded-full border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-700 hover:text-rose-700" @click.prevent="clearError({ redirect: s.to })">
                {{ s.name }}
              </NuxtLink>
            </li>
          </ul>
        </nav>
      </div>
    </main>
    <Footer />
  </div>
</template>
