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
    class="sticky top-0 z-20 flex h-19 items-center gap-5 border-b border-stone-200 bg-paper/90 px-5 backdrop-blur lg:gap-14 lg:px-10"
  >
    <NuxtLink
      to="/"
      class="flex items-center gap-2.5 text-lg font-bold tracking-tight"
      aria-label="RantevouOS dashboard"
      ><span
        class="grid size-8.5 place-items-center rounded-[10px] bg-ink text-white"
        ><CalendarDays :size="19" /></span
      ><span>rantevou<span class="text-rose">OS</span></span></NuxtLink
    >
    <nav
      class="hidden flex-1 items-center gap-2 md:flex"
      aria-label="Primary navigation"
    >
      <NuxtLink
        to="/"
        class="flex items-center gap-2 rounded-lg bg-white px-3 py-2.5 text-sm text-ink shadow-sm"
        ><CalendarDays :size="16" /> Calendar</NuxtLink
      ><a
        href="#customers"
        class="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-stone-500 transition hover:bg-white hover:text-ink"
        ><UsersRound :size="16" /> Customers</a
      ><a
        href="#settings"
        class="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-stone-500 transition hover:bg-white hover:text-ink"
        ><Settings :size="16" /> Settings</a
      >
    </nav>
    <div class="ml-auto flex items-center gap-5">
      <NuxtLink
        to="/book/maria-beauty-studio"
        class="hidden text-sm font-semibold text-rose sm:block"
        >Open booking page</NuxtLink
      ><button
        class="flex items-center gap-2 border-0 bg-transparent text-sm"
        type="button"
      >
        <span
          class="grid size-7.5 place-items-center rounded-full bg-rose-soft text-[11px] font-bold text-[#7b5361]"
          >MP</span
        ><span class="hidden sm:inline">Maria</span><ChevronDown :size="15" />
      </button>
    </div>
  </header>
</template>
