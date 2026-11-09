<script setup lang="ts">
import { CalendarCheck } from "lucide-vue-next";

withDefaults(defineProps<{ dark?: boolean; to?: string }>(), { dark: false, to: "/" });
</script>

<template>
  <NuxtLink
    :to="to"
    class="inline-flex min-h-11 items-center gap-2.5 text-lg font-bold tracking-tight"
    :class="dark ? 'text-white' : 'text-stone-900'"
    :aria-label="`${BRAND.name} home`"
  >
    <span
      class="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-rose-500 to-rose-700 text-white shadow-sm shadow-rose-600/30"
    >
      <CalendarCheck :size="18" :stroke-width="2.4" />
    </span>
    <span>{{ BRAND.name }}</span>
  </NuxtLink>
</template>
