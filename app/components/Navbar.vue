<script setup lang="ts">
import { ref } from "vue";
import { CalendarDays, ChevronDown, Info, HelpCircle } from "lucide-vue-next";

// Direct Page Links
const navLinks = [
  { name: "Features", to: "/features" },
  { name: "Pricing", to: "/pricing" },
  { name: "Contact Us", to: "/contact" },
];

// Dropdown Sub-links for Company / Information
const aboutDropdownLinks = [
  {
    name: "How it Works",
    to: "/how-it-works",
    description: "Learn how to automate appointments in minutes.",
    icon: CalendarDays,
  },
  {
    name: "About Us",
    to: "/about",
    description: "Our mission for Greek appointment businesses.",
    icon: Info,
  },
];

// Dropdown State
const isDropdownOpen = ref(false);
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

    <!-- Center Navigation Links -->
    <nav class="hidden items-center gap-1 md:flex">
      <!-- Standard Navigation Links -->
      <NuxtLink
        v-for="link in navLinks"
        :key="link.name"
        :to="link.to"
        class="rounded-xl px-4 py-2 text-sm font-semibold text-stone-600 transition-colors hover:bg-stone-100/60 hover:text-stone-900"
      >
        {{ link.name }}
      </NuxtLink>

      <!-- Interactive Dropdown (How it Works & About Us) -->
      <div
        class="relative"
        @mouseenter="isDropdownOpen = true"
        @mouseleave="isDropdownOpen = false"
      >
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-stone-600 transition-colors hover:bg-stone-100/60 hover:text-stone-900"
          :aria-expanded="isDropdownOpen"
        >
          <span>Company</span>
          <ChevronDown
            class="size-4 text-stone-400 transition-transform duration-200"
            :class="{ 'rotate-180 text-stone-900': isDropdownOpen }"
          />
        </button>

        <!-- Dropdown Menu Box -->
        <Transition
          enter-active-class="transition duration-150 ease-out"
          enter-from-class="transform opacity-0 scale-95 -translate-y-1"
          enter-to-class="transform opacity-100 scale-100 translate-y-0"
          leave-active-class="transition duration-100 ease-in"
          leave-from-class="transform opacity-100 scale-100 translate-y-0"
          leave-to-class="transform opacity-0 scale-95 -translate-y-1"
        >
          <div
            v-if="isDropdownOpen"
            class="absolute top-full left-0 mt-2 w-64 rounded-2xl border border-stone-200/80 bg-white/95 p-2 shadow-xl shadow-stone-900/5 backdrop-blur-md"
          >
            <NuxtLink
              v-for="item in aboutDropdownLinks"
              :key="item.name"
              :to="item.to"
              class="group flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-stone-100/80"
              @click="isDropdownOpen = false"
            >
              <div
                class="mt-0.5 grid size-8 place-items-center rounded-lg border border-stone-200/60 bg-stone-50 text-stone-700 transition-colors group-hover:border-stone-300 group-hover:bg-white"
              >
                <component :is="item.icon" class="size-4" />
              </div>
              <div>
                <div class="text-sm font-bold text-stone-900">
                  {{ item.name }}
                </div>
                <p class="text-xs text-stone-500 leading-snug mt-0.5">
                  {{ item.description }}
                </p>
              </div>
            </NuxtLink>
          </div>
        </Transition>
      </div>
    </nav>

    <!-- Action Buttons -->
    <div class="flex items-center gap-3">
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
    </div>
  </header>
</template>
