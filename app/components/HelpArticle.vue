<script setup lang="ts">
import { computed } from "vue";
import { Hash, Lightbulb, Info, TriangleAlert, ArrowLeft, ArrowRight, Mail } from "lucide-vue-next";
import type { DocArticle } from "~/utils/help-docs";

/** Renders one help article in docs style, with prev / next links. */
const props = defineProps<{ doc: DocArticle }>();

const index = computed(() => HELP_DOCS.findIndex((d) => d.slug === props.doc.slug));
const linkOf = (slug: string) => (slug === "introduction" ? "/help" : `/help/${slug}`);
const prev = computed(() => HELP_DOCS[index.value - 1]);
const next = computed(() => HELP_DOCS[index.value + 1]);
</script>

<template>
  <article class="mx-auto max-w-3xl">
    <nav aria-label="Breadcrumb" class="hidden text-sm text-stone-500 lg:block">
      <NuxtLink to="/help" class="hover:text-stone-900">Help</NuxtLink>
      <span class="mx-2 text-stone-300">/</span>
      <span>{{ doc.group }}</span>
    </nav>
    <h1 class="mt-2 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">{{ doc.title }}</h1>
    <p class="mt-3 text-lg leading-8 text-stone-500">{{ doc.description }}</p>
    <hr class="my-8 border-stone-200" />

    <slot name="before" />

    <section v-for="s in doc.sections" :key="s.id" class="mb-10">
      <h2 :id="s.id" class="group relative scroll-mt-32 text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl lg:scroll-mt-24">
        <a :href="`#${s.id}`" class="absolute -left-6 top-1/2 hidden -translate-y-1/2 text-stone-300 opacity-0 transition group-hover:opacity-100 hover:text-rose-600 lg:block" :aria-label="`Link to ${s.title}`">
          <Hash :size="18" />
        </a>
        {{ s.title }}
      </h2>
      <template v-for="(b, i) in s.blocks" :key="i">
        <p v-if="b.p" class="mt-4 text-[15px] leading-7 text-stone-700 sm:text-base sm:leading-8">{{ b.p }}</p>
        <ol v-if="b.steps" class="mt-5 space-y-3">
          <li v-for="(step, n) in b.steps" :key="n" class="flex gap-3 text-[15px] leading-7 text-stone-700 sm:text-base">
            <span class="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border border-stone-200 bg-stone-50 text-xs font-semibold text-stone-700">{{ n + 1 }}</span>
            <span>{{ step }}</span>
          </li>
        </ol>
        <ul v-if="b.list" class="mt-4 space-y-2 pl-5">
          <li v-for="(item, n) in b.list" :key="n" class="list-disc text-[15px] leading-7 text-stone-700 marker:text-rose-400 sm:text-base">{{ item }}</li>
        </ul>
        <div v-if="b.tip" class="mt-5 flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-[15px] leading-7 text-emerald-900">
          <Lightbulb :size="18" class="mt-1 shrink-0 text-emerald-600" /><p><b class="font-semibold">Tip.</b> {{ b.tip }}</p>
        </div>
        <div v-if="b.note" class="mt-5 flex gap-3 rounded-xl border border-sky-200 bg-sky-50/70 p-4 text-[15px] leading-7 text-sky-900">
          <Info :size="18" class="mt-1 shrink-0 text-sky-600" /><p><b class="font-semibold">Note.</b> {{ b.note }}</p>
        </div>
        <div v-if="b.warning" class="mt-5 flex gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-[15px] leading-7 text-amber-900">
          <TriangleAlert :size="18" class="mt-1 shrink-0 text-amber-600" /><p><b class="font-semibold">Warning.</b> {{ b.warning }}</p>
        </div>
      </template>
    </section>

    <slot name="after" />

    <!-- prev / next -->
    <nav aria-label="Previous and next article" class="mt-14 grid gap-4 border-t border-stone-200 pt-8 sm:grid-cols-2">
      <NuxtLink v-if="prev" :to="linkOf(prev.slug)" class="group rounded-xl border border-stone-200 p-4 transition hover:border-rose-300 hover:bg-rose-50/30">
        <span class="flex items-center gap-1.5 text-xs text-stone-500"><ArrowLeft :size="14" class="transition group-hover:-translate-x-0.5" /> Previous</span>
        <span class="mt-1 block font-semibold text-stone-900 group-hover:text-rose-600">{{ prev.title }}</span>
      </NuxtLink>
      <span v-else class="hidden sm:block" />
      <NuxtLink v-if="next" :to="linkOf(next.slug)" class="group rounded-xl border border-stone-200 p-4 text-right transition hover:border-rose-300 hover:bg-rose-50/30">
        <span class="flex items-center justify-end gap-1.5 text-xs text-stone-500">Next <ArrowRight :size="14" class="transition group-hover:translate-x-0.5" /></span>
        <span class="mt-1 block font-semibold text-stone-900 group-hover:text-rose-600">{{ next.title }}</span>
      </NuxtLink>
    </nav>

    <p class="mt-10 flex flex-wrap items-center gap-2 text-sm text-stone-500">
      <Mail :size="15" /> Something unclear?
      <NuxtLink to="/contactus" class="font-semibold text-rose-600 hover:underline">Ask us</NuxtLink>
      — we use your questions to improve these docs.
    </p>
  </article>
</template>
