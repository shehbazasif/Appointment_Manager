<script setup lang="ts">
defineProps<{ eyebrow: string; title: string; updated: string }>();
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 pb-20 pt-14 sm:px-6 sm:pt-20">
    <p class="text-xs font-bold uppercase tracking-[0.16em] text-rose-600">{{ eyebrow }}</p>
    <h1 class="mt-3 font-display text-4xl text-stone-900 sm:text-5xl">{{ title }}</h1>
    <p class="mt-3 text-sm text-stone-500">Last updated: {{ updated }}</p>
    <article class="legal mt-10 rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm sm:p-10">
      <slot />
    </article>
  </div>
</template>

<style scoped>
.legal :deep(h2) {
  margin-top: 2.25rem;
  font-size: 1.15rem;
  font-weight: 700;
  color: #1c1917;
  scroll-margin-top: 6rem;
}
.legal :deep(h2:first-child) { margin-top: 0; }
.legal :deep(p),
.legal :deep(li) {
  margin-top: 0.75rem;
  font-size: 15px;
  line-height: 1.75;
  color: #57534e;
}
.legal :deep(ul) { list-style: disc; padding-left: 1.25rem; }
.legal :deep(a) { color: #be123c; text-decoration: underline; text-underline-offset: 3px; }
</style>
