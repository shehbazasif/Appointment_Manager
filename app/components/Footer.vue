<script setup lang="ts">
import { Mail, Globe2 } from "lucide-vue-next";

const columns = [
  {
    title: "Product",
    links: [
      { name: "Features", to: "/features" },
      { name: "How it works", to: "/how-it-works" },
      { name: "Pricing", to: "/pricing" },
      { name: "Industries", to: "/industries" },
    ],
  },
  {
    title: "Company",
    links: [
      { name: "About", to: "/about" },
      { name: "Contact", to: "/contactus" },
      { name: "FAQ", to: "/faq" },
      { name: "Help & getting started", to: "/help" },
    ],
  },
  {
    title: "Legal",
    links: [
      { name: "Privacy Policy", to: "/privacy" },
      { name: "Terms of Service", to: "/terms" },
      { name: "Cookies", to: "/privacy#cookies" },
    ],
  },
];
const year = new Date().getFullYear();
</script>

<template>
  <footer
    class="site-focus border-t border-stone-200 bg-stone-950 text-stone-400"
    style="padding-bottom: env(safe-area-inset-bottom)"
  >
    <div class="mx-auto max-w-7xl px-4 pb-10 pt-14 sm:px-6 lg:px-10">
      <div class="grid gap-10 lg:grid-cols-12">
        <div class="lg:col-span-4">
          <BrandLogo dark />
          <p class="mt-4 max-w-sm text-sm leading-6">
            Online booking, reminders, staff and on-location jobs for small businesses — in Greece, the Gulf and worldwide.
          </p>
          <a
            :href="`mailto:${BRAND.email}`"
            class="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-white hover:text-rose-300"
          >
            <Mail :size="16" /> {{ BRAND.email }}
          </a>
        </div>

        <div class="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-8">
          <div v-for="col in columns" :key="col.title">
            <h2 class="text-sm font-bold text-white">{{ col.title }}</h2>
            <ul class="mt-3 space-y-1">
              <li v-for="link in col.links" :key="link.to">
                <NuxtLink :to="link.to" class="inline-flex min-h-10 items-center text-sm transition-colors hover:text-white">
                  {{ link.name }}
                </NuxtLink>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div class="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs sm:flex-row sm:items-center sm:justify-between">
        <p>&copy; {{ year }} {{ BRAND.name }}. All rights reserved. Made in {{ BRAND.basedIn }}.</p>
        <p class="inline-flex items-center gap-1.5">
          <Globe2 :size="14" /> English site · works in any country, time zone and currency
        </p>
      </div>
    </div>
  </footer>
</template>
