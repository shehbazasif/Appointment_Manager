<script setup lang="ts">
import {
  CalendarDays,
  ChevronDown,
  Settings,
  UsersRound,
} from "lucide-vue-next";
</script>

<template>
  <header
    class="sticky top-0 z-50 flex w-full items-center justify-between border-b border-stone-200/60 bg-white/70 px-6 py-4 backdrop-blur-md backdrop-saturate-150 transition-all lg:px-12"
  >
    <!-- Brand Logo -->
    <NuxtLink
      to="/landing"
      class="inline-flex items-center gap-2.5 text-xl font-bold tracking-tight text-stone-900 transition-opacity hover:opacity-90"
    >
      <span
        class="grid size-8 place-items-center rounded-lg bg-stone-900 text-sm font-black text-white shadow-sm"
      >
        R
      </span>
      <span>rantevou<span class="text-rose-600">OS</span></span>
    </NuxtLink>

    <!-- Navigation Action Links -->
    <nav class="flex items-center gap-3">
      <NuxtLink
        to="/login"
        class="rounded-xl px-4 py-2 text-sm font-semibold text-stone-600 transition-colors hover:bg-stone-100/60 hover:text-stone-900"
      >
        Sign in
      </NuxtLink>
      <NuxtLink
        to="/register"
        class="rounded-xl bg-stone-900 px-4.5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-stone-800 active:scale-[0.98]"
      >
        Start free
      </NuxtLink>
    </nav>
  </header>
</template>
