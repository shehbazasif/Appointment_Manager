<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from "vue";
import { Menu, X, ArrowRight, LayoutDashboard } from "lucide-vue-next";

const links = [
  { name: "Features", to: "/features" },
  { name: "Industries", to: "/industries" },
  { name: "Pricing", to: "/pricing" },
  { name: "FAQ", to: "/faq" },
  { name: "Contact", to: "/contactus" },
];

// Logged-in visitors get a "Dashboard" button instead of "Sign in".
const user = useSupabaseUser();

const open = ref(false);
const route = useRoute();
watch(() => route.fullPath, () => (open.value = false));

// Lock page scroll behind the full-screen menu (iOS-safe).
watch(open, (isOpen) => {
  if (!import.meta.client) return;
  document.documentElement.style.overflow = isOpen ? "hidden" : "";
});
onBeforeUnmount(() => {
  if (import.meta.client) document.documentElement.style.overflow = "";
});

const onKey = (e: KeyboardEvent) => {
  if (e.key === "Escape") open.value = false;
};
</script>

<template>
  <header
    class="site-focus sticky top-0 z-50 w-full border-b border-stone-200/70 bg-white/80 backdrop-blur-md backdrop-saturate-150"
    style="padding-top: env(safe-area-inset-top)"
    @keydown="onKey"
  >
    <div class="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
      <BrandLogo />

      <nav class="hidden items-center gap-1 lg:flex" aria-label="Main">
        <NuxtLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="rounded-xl px-3.5 py-2 text-sm font-semibold text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900"
          active-class="!text-stone-900 bg-stone-100"
        >
          {{ link.name }}
        </NuxtLink>
      </nav>

      <div class="hidden items-center gap-2 lg:flex">
        <NuxtLink
          v-if="user"
          to="/dashboard"
          class="site-btn inline-flex min-h-11 items-center gap-2 rounded-xl bg-stone-900 px-4 text-sm font-semibold text-white shadow-sm hover:bg-stone-800"
        >
          <LayoutDashboard :size="16" /> Dashboard
        </NuxtLink>
        <template v-else>
          <NuxtLink
            to="/login"
            class="inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold text-stone-600 hover:bg-stone-100 hover:text-stone-900"
          >
            Sign in
          </NuxtLink>
          <NuxtLink
            to="/register"
            class="site-btn inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white shadow-sm shadow-rose-600/25 hover:bg-rose-700"
          >
            Start free trial <ArrowRight :size="16" />
          </NuxtLink>
        </template>
      </div>

      <button
        type="button"
        class="grid size-11 place-items-center rounded-xl text-stone-800 hover:bg-stone-100 lg:hidden"
        :aria-expanded="open"
        aria-controls="mobile-menu"
        :aria-label="open ? 'Close menu' : 'Open menu'"
        @click="open = !open"
      >
        <X v-if="open" :size="22" />
        <Menu v-else :size="22" />
      </button>
    </div>

    <!-- Phone / tablet: full-screen sheet -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div
        v-if="open"
        id="mobile-menu"
        class="fixed inset-x-0 bottom-0 z-50 flex flex-col overflow-y-auto overscroll-contain bg-white px-4 pt-4 lg:hidden"
        style="top: calc(4rem + env(safe-area-inset-top)); padding-bottom: calc(1.5rem + env(safe-area-inset-bottom))"
      >
        <nav class="flex flex-col" aria-label="Mobile">
          <NuxtLink
            v-for="link in links"
            :key="link.to"
            :to="link.to"
            class="flex min-h-14 items-center justify-between border-b border-stone-100 px-2 text-lg font-semibold text-stone-900"
          >
            {{ link.name }}
            <ArrowRight :size="18" class="text-stone-300" />
          </NuxtLink>
          <NuxtLink
            v-for="extra in [
              { name: 'How it works', to: '/how-it-works' },
              { name: 'About', to: '/about' },
              { name: 'Help & getting started', to: '/help' },
            ]"
            :key="extra.to"
            :to="extra.to"
            class="flex min-h-12 items-center px-2 text-base font-medium text-stone-500"
          >
            {{ extra.name }}
          </NuxtLink>
        </nav>
        <div class="mt-auto grid gap-3 pt-8">
          <NuxtLink
            v-if="user"
            to="/dashboard"
            class="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-stone-900 text-base font-semibold text-white"
          >
            <LayoutDashboard :size="18" /> Open dashboard
          </NuxtLink>
          <template v-else>
            <NuxtLink
              to="/register"
              class="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-rose-600 text-base font-semibold text-white"
            >
              Start free trial <ArrowRight :size="18" />
            </NuxtLink>
            <NuxtLink
              to="/login"
              class="inline-flex min-h-12 items-center justify-center rounded-2xl border border-stone-200 text-base font-semibold text-stone-900"
            >
              Sign in
            </NuxtLink>
          </template>
        </div>
      </div>
    </Transition>
  </header>
</template>
