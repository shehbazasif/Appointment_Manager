<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onBeforeUnmount, useId } from "vue";
import { ChevronDown, Check, Search, X } from "lucide-vue-next";

/**
 * Multi-select dropdown with tags. v-model is an array of values.
 *   <MultiSelect v-model="ids" :options="[{ value, label, hint }]" />
 */
interface Opt { value: string; label: string; hint?: string }
const model = defineModel<string[]>({ default: () => [] });
const props = withDefaults(defineProps<{ options: Opt[]; placeholder?: string; emptyText?: string }>(), {
  placeholder: "Select…",
  emptyText: "No matches",
});
const { t } = useT();

const open = ref(false);
const query = ref("");
const root = ref<HTMLElement | null>(null);
const searchEl = ref<HTMLInputElement | null>(null);
const listId = useId();

const selectedOpts = computed(() => props.options.filter((o) => model.value.includes(o.value)));
const filtered = computed(() => {
  const q = query.value.trim().toLowerCase();
  return q ? props.options.filter((o) => `${o.label} ${o.hint ?? ""}`.toLowerCase().includes(q)) : props.options;
});
const allSelected = computed(() => props.options.length > 0 && props.options.every((o) => model.value.includes(o.value)));

const toggle = (v: string) => {
  model.value = model.value.includes(v) ? model.value.filter((x) => x !== v) : [...model.value, v];
};
const remove = (v: string) => (model.value = model.value.filter((x) => x !== v));
const toggleAll = () => (model.value = allSelected.value ? [] : props.options.map((o) => o.value));

const openMenu = async () => {
  open.value = true;
  query.value = "";
  await nextTick();
  searchEl.value?.focus();
};
const onDocDown = (e: Event) => {
  if (open.value && root.value && !root.value.contains(e.target as Node)) open.value = false;
};
onMounted(() => document.addEventListener("pointerdown", onDocDown));
onBeforeUnmount(() => document.removeEventListener("pointerdown", onDocDown));
</script>

<template>
  <div ref="root" class="relative">
    <div
      role="button"
      tabindex="0"
      :aria-expanded="open"
      :aria-controls="listId"
      aria-haspopup="listbox"
      class="flex min-h-12 w-full cursor-pointer flex-wrap items-center gap-1.5 rounded-2xl border bg-stone-50/60 px-2.5 py-2 transition"
      :class="open ? 'border-stone-900 bg-white ring-4 ring-stone-900/5' : 'border-stone-200 hover:border-stone-300'"
      @click="open ? (open = false) : openMenu()"
      @keydown.enter.prevent="openMenu"
      @keydown.down.prevent="openMenu"
      @keydown.esc="open = false"
    >
      <span
        v-for="o in selectedOpts"
        :key="o.value"
        class="inline-flex max-w-full items-center gap-1 rounded-lg bg-stone-900 py-1 pe-1 ps-2.5 text-xs font-semibold text-white"
      >
        <span class="truncate">{{ o.label }}</span>
        <button
          type="button"
          class="grid size-5 shrink-0 place-items-center rounded-md text-white/70 hover:bg-white/20 hover:text-white"
          :aria-label="t('Remove {name}', { name: o.label })"
          @click.stop="remove(o.value)"
        >
          <X :size="12" />
        </button>
      </span>
      <span v-if="!selectedOpts.length" class="px-1 text-sm text-stone-400">{{ t(placeholder) }}</span>
      <ChevronDown :size="16" class="ms-auto shrink-0 text-stone-400 transition-transform duration-200" :class="open ? 'rotate-180 text-stone-700' : ''" />
    </div>

    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
      leave-active-class="transition duration-100 ease-in"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <div
        v-if="open"
        class="absolute start-0 top-full z-50 mt-1.5 w-full overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl shadow-stone-900/15"
        @keydown.esc="open = false"
      >
        <div class="flex items-center gap-2 border-b border-stone-100 p-2">
          <div class="relative flex-1">
            <Search :size="15" class="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              ref="searchEl"
              v-model="query"
              type="search"
              autocomplete="off"
              :placeholder="t('Type to search…')"
              class="w-full rounded-xl border border-stone-200 bg-stone-50 py-2 pe-3 ps-8 text-xs outline-none focus:border-stone-900 focus:bg-white"
            />
          </div>
          <button
            v-if="options.length > 1"
            type="button"
            class="shrink-0 rounded-lg px-2 py-1.5 text-[11px] font-bold text-stone-600 hover:bg-stone-100"
            @click="toggleAll"
          >
            {{ allSelected ? t("Clear all") : t("Select all") }}
          </button>
        </div>
        <ul :id="listId" role="listbox" aria-multiselectable="true" class="max-h-60 overflow-y-auto overscroll-contain p-1.5 max-md:max-h-[40dvh]">
          <li
            v-for="o in filtered"
            :key="o.value"
            role="option"
            :aria-selected="model.includes(o.value)"
            tabindex="0"
            class="flex min-h-10 cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 text-sm outline-none transition-colors hover:bg-stone-50 focus-visible:bg-stone-100 max-md:min-h-11"
            @click="toggle(o.value)"
            @keydown.enter.prevent="toggle(o.value)"
            @keydown.space.prevent="toggle(o.value)"
          >
            <span
              class="grid size-5 shrink-0 place-items-center rounded-md border-2 transition"
              :class="model.includes(o.value) ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 bg-white'"
            >
              <Check v-if="model.includes(o.value)" :size="13" :stroke-width="3" />
            </span>
            <span class="min-w-0 flex-1 truncate text-stone-800" :class="model.includes(o.value) ? 'font-semibold' : ''">{{ o.label }}</span>
            <span v-if="o.hint" class="shrink-0 text-[11px] text-stone-400">{{ o.hint }}</span>
          </li>
          <li v-if="!filtered.length" class="px-3 py-4 text-center text-xs text-stone-500">{{ t(emptyText) }}</li>
        </ul>
        <div class="flex items-center justify-between border-t border-stone-100 px-3 py-2 text-[11px] text-stone-500">
          <span>{{ t("{n} selected", { n: model.length }) }}</span>
          <button type="button" class="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-bold text-white" @click="open = false">{{ t("Done") }}</button>
        </div>
      </div>
    </Transition>
  </div>
</template>
