<script setup lang="ts">
// Footer under a table: "1–25 of 120", rows per page, previous / next.
import { ChevronLeft, ChevronRight } from "lucide-vue-next";
const { t } = useT();

const props = defineProps<{
  pager: { page: number; pageSize: number | string; size: number; total: number; pages: number; from: number; to: number };
}>();

const pageList = () => {
  const { page, pages } = props.pager;
  const out: (number | "…")[] = [];
  for (let p = 1; p <= pages; p++) {
    if (p === 1 || p === pages || Math.abs(p - page) <= 1) out.push(p);
    else if (out[out.length - 1] !== "…") out.push("…");
  }
  return out;
};
</script>

<template>
  <div
    class="sticky bottom-0 z-[4] grid grid-cols-1 items-center gap-2 rounded-b-[var(--ui-radius-card,8px)] border-t border-stone-200 bg-white/95 px-4 py-3 text-[13px] text-stone-600 backdrop-blur sm:grid-cols-[1fr_auto_1fr]"
  >
    <!-- left: where you are -->
    <span class="text-center tabular-nums sm:text-start">
      {{ t("{from}–{to} of {total}", { from: props.pager.from, to: props.pager.to, total: props.pager.total }) }}
    </span>

    <!-- center: pages -->
    <nav class="flex items-center justify-center gap-1" :aria-label="t('Pages')">
      <button
        type="button"
        class="ui-btn ui-btn-secondary ui-btn-icon ui-btn-sm"
        :disabled="props.pager.page <= 1"
        :aria-label="t('Previous page')"
        @click="props.pager.page--"
      >
        <ChevronLeft :size="16" class="rtl:rotate-180" />
      </button>
      <template v-for="(p, i) in pageList()" :key="i">
        <span v-if="p === '…'" class="px-1 text-stone-400">…</span>
        <button
          v-else
          type="button"
          class="ui-btn ui-btn-sm min-w-[32px] !px-2 tabular-nums"
          :class="p === props.pager.page ? 'ui-btn-primary' : 'ui-btn-ghost'"
          :aria-current="p === props.pager.page ? 'page' : undefined"
          @click="props.pager.page = p"
        >
          {{ p }}
        </button>
      </template>
      <button
        type="button"
        class="ui-btn ui-btn-secondary ui-btn-icon ui-btn-sm"
        :disabled="props.pager.page >= props.pager.pages"
        :aria-label="t('Next page')"
        @click="props.pager.page++"
      >
        <ChevronRight :size="16" class="rtl:rotate-180" />
      </button>
    </nav>

    <!-- right: rows per page -->
    <label class="hidden items-center justify-end gap-2 sm:flex">
      <span>{{ t("Rows per page") }}</span>
      <AppSelect v-model="props.pager.pageSize" class="w-32">
        <option value="auto">{{ t("Fit screen") }}</option>
        <option :value="10">10</option>
        <option :value="25">25</option>
        <option :value="50">50</option>
        <option :value="100">100</option>
      </AppSelect>
    </label>
  </div>
</template>
