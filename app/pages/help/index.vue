<script setup lang="ts">
import { Rocket, LayoutTemplate, CalendarClock, Users, Smartphone, ArrowRight } from "lucide-vue-next";

definePageMeta({ layout: "marketing" });
const doc = findHelpDoc("introduction")!;
usePageSeo({
  path: "/help",
  title: "Help center",
  description: `Documentation for ${BRAND.name}: set up your business, services, hours, booking link, staff, attendance, on-location jobs and imports.`,
});

const icons: Record<string, any> = {
  "Getting started": Rocket,
  "Set up your booking page": LayoutTemplate,
  "Daily work": CalendarClock,
  Team: Users,
  "Data & devices": Smartphone,
};
const firstOf = (g: string) => HELP_DOCS.find((d) => d.group === g && d.slug !== "introduction") ?? HELP_DOCS.find((d) => d.group === g)!;
</script>

<template>
  <HelpDocsShell :toc="[...doc.sections.map((s) => ({ id: s.id, title: s.title })), { id: 'browse', title: 'Browse the docs' }]" crumb="Help" :title="doc.title">
    <HelpArticle :doc="doc">
      <template #after>
        <section class="mb-4">
          <h2 id="browse" class="scroll-mt-32 text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl lg:scroll-mt-24">Browse the docs</h2>
          <div class="mt-5 grid gap-3 sm:grid-cols-2">
            <NuxtLink
              v-for="g in HELP_GROUPS"
              :key="g"
              :to="`/help/${firstOf(g).slug}`"
              class="group rounded-xl border border-stone-200 p-5 transition hover:border-rose-300 hover:shadow-sm"
            >
              <span class="grid size-9 place-items-center rounded-lg bg-rose-50 text-rose-600"><component :is="icons[g] ?? Rocket" :size="18" /></span>
              <span class="mt-3 flex items-center gap-1 font-semibold text-stone-900 group-hover:text-rose-600">
                {{ g }} <ArrowRight :size="15" class="transition group-hover:translate-x-0.5" />
              </span>
              <span class="mt-1 block text-sm leading-6 text-stone-500">
                {{ HELP_DOCS.filter((d) => d.group === g).map((d) => d.title).join(" · ") }}
              </span>
            </NuxtLink>
          </div>
        </section>
      </template>
    </HelpArticle>
  </HelpDocsShell>
</template>
