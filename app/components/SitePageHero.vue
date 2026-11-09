<script setup lang="ts">
defineProps<{ eyebrow?: string; title: string; subtitle?: string }>();
</script>

<template>
  <section class="relative overflow-hidden">
    <div
      class="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_28rem_at_85%_-10%,#fbe3e7_0,transparent_60%),radial-gradient(40rem_22rem_at_0%_0%,#f3f0ea_0,transparent_60%)]"
      aria-hidden="true"
    />
    <div class="relative mx-auto max-w-4xl px-4 pb-12 pt-14 text-center sm:px-6 sm:pt-20 lg:pb-16">
      <p v-if="eyebrow" v-reveal class="text-xs font-bold uppercase tracking-[0.16em] text-rose-600">{{ eyebrow }}</p>
      <h1 v-reveal="60" class="mt-3 text-balance font-display text-4xl leading-[1.1] tracking-tight text-stone-900 sm:text-5xl lg:text-6xl">
        {{ title }}
      </h1>
      <p v-if="subtitle" v-reveal="120" class="mx-auto mt-5 max-w-2xl text-pretty text-base leading-7 text-stone-600 sm:text-lg">
        {{ subtitle }}
      </p>
      <div v-if="$slots.default" v-reveal="180" class="mt-8 flex flex-wrap justify-center gap-3">
        <slot />
      </div>
    </div>
  </section>
</template>
