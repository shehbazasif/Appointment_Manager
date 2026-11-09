<script setup lang="ts">
import { computed } from "vue";

definePageMeta({ layout: "marketing" });

const route = useRoute();
const slug = computed(() => String(route.params.slug ?? ""));
if (slug.value === "introduction") await navigateTo("/help", { redirectCode: 301 });

const doc = computed(() => findHelpDoc(slug.value));
if (!doc.value) throw createError({ statusCode: 404, statusMessage: "Help article not found", fatal: true });

usePageSeo({
  path: `/help/${slug.value}`,
  title: `${doc.value.title} · Help`,
  description: doc.value.description,
});
const toc = computed(() => doc.value?.sections.map((s) => ({ id: s.id, title: s.title })) ?? []);
</script>

<template>
  <HelpDocsShell v-if="doc" :key="doc.slug" :toc="toc" :crumb="doc.group" :title="doc.title">
    <HelpArticle :doc="doc" />
  </HelpDocsShell>
</template>
