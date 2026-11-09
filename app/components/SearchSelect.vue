<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from "vue";
import { ChevronDown, Search, Check, X } from "lucide-vue-next";

/**
 * Searchable dropdown (combobox). Tap to open, type to filter.
 * `allowCustom` lets the user keep text that is not in the list (e.g. a city).
 */
interface SearchOption {
  value: string;
  label: string;
  /** small grey text on the right (e.g. "GMT+3") */
  hint?: string;
  /** section title the option is listed under */
  group?: string;
  /** extra words to match while searching */
  keywords?: string;
}

const model = defineModel<string>({ default: "" });
const props = withDefaults(
  defineProps<{
    options: SearchOption[];
    placeholder?: string;
    searchPlaceholder?: string;
    allowCustom?: boolean;
    disabled?: boolean;
    id?: string;
  }>(),
  {
    placeholder: "Select…",
    searchPlaceholder: "Type to search…",
    allowCustom: false,
    disabled: false,
    id: undefined,
  },
);

const open = ref(false);
const query = ref("");
const active = ref(0);
const root = ref<HTMLElement | null>(null);
const searchEl = ref<HTMLInputElement | null>(null);
const listEl = ref<HTMLElement | null>(null);
const listId = `ss-${Math.random().toString(36).slice(2, 8)}`;

const selected = computed(() => props.options.find((o) => o.value === model.value) ?? null);
const displayText = computed(() => selected.value?.label ?? model.value ?? "");

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[_/]/g, " ");

const filtered = computed(() => {
  const q = norm(query.value.trim());
  const list = q
    ? props.options.filter((o) =>
        norm(`${o.label} ${o.value} ${o.hint ?? ""} ${o.keywords ?? ""}`).includes(q),
      )
    : props.options;
  return list.slice(0, 300); // keep long lists (time zones) fast
});

const customValue = computed(() => {
  const q = query.value.trim();
  if (!props.allowCustom || !q) return "";
  return props.options.some((o) => o.label.toLowerCase() === q.toLowerCase()) ? "" : q;
});

// rows = options (+ "Use …" row for custom text)
const rowCount = computed(() => filtered.value.length + (customValue.value ? 1 : 0));

const openList = async () => {
  if (props.disabled) return;
  open.value = true;
  query.value = "";
  const i = filtered.value.findIndex((o) => o.value === model.value);
  active.value = i >= 0 ? i : 0;
  await nextTick();
  searchEl.value?.focus();
  scrollActiveIntoView();
};
const close = () => {
  open.value = false;
  query.value = "";
};
const choose = (value: string) => {
  model.value = value;
  close();
};
const chooseActive = () => {
  if (active.value < filtered.value.length) choose(filtered.value[active.value]!.value);
  else if (customValue.value) choose(customValue.value);
};

const scrollActiveIntoView = () => {
  nextTick(() => {
    listEl.value?.querySelector<HTMLElement>(`[data-index="${active.value}"]`)?.scrollIntoView({ block: "nearest" });
  });
};
const onKey = (e: KeyboardEvent) => {
  if (e.key === "ArrowDown") {
    e.preventDefault();
    active.value = Math.min(active.value + 1, rowCount.value - 1);
    scrollActiveIntoView();
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    active.value = Math.max(active.value - 1, 0);
    scrollActiveIntoView();
  } else if (e.key === "Enter") {
    e.preventDefault();
    chooseActive();
  } else if (e.key === "Escape") {
    e.preventDefault();
    close();
  }
};
watch(query, () => {
  active.value = 0;
});

const onDocDown = (e: Event) => {
  if (open.value && root.value && !root.value.contains(e.target as Node)) close();
};
onMounted(() => document.addEventListener("pointerdown", onDocDown));
onBeforeUnmount(() => document.removeEventListener("pointerdown", onDocDown));

// group headers: show a title when the group changes
const showGroup = (i: number) => {
  const g = filtered.value[i]?.group;
  return !!g && (i === 0 || filtered.value[i - 1]?.group !== g);
};
</script>

<template>
  <div ref="root" class="relative">
    <button
      :id="id"
      type="button"
      :disabled="disabled"
      :aria-expanded="open"
      :aria-controls="listId"
      aria-haspopup="listbox"
      class="flex min-h-11 w-full items-center gap-2 rounded-xl border border-stone-200 bg-stone-50/60 px-3 py-2.5 text-left text-xs outline-none transition focus:border-stone-900 focus:bg-white disabled:opacity-60 max-md:text-base"
      :class="open ? 'border-stone-900 bg-white' : ''"
      @click="open ? close() : openList()"
      @keydown.down.prevent="openList"
    >
      <span :class="['min-w-0 flex-1 truncate', displayText ? 'text-stone-900' : 'text-stone-400']">
        <slot name="selected" :option="selected">{{ displayText || placeholder }}</slot>
      </span>
      <span v-if="selected?.hint" class="shrink-0 text-[11px] text-stone-400">{{ selected.hint }}</span>
      <ChevronDown :size="16" class="shrink-0 text-stone-400 transition" :class="open ? 'rotate-180' : ''" />
    </button>

    <div
      v-if="open"
      class="absolute right-0 top-full z-40 mt-1 w-full min-w-56 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xl"
    >
      <div class="relative border-b border-stone-100 p-2">
        <Search :size="15" class="pointer-events-none absolute left-4.5 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          ref="searchEl"
          v-model="query"
          type="search"
          role="combobox"
          :aria-controls="listId"
          :aria-activedescendant="`${listId}-${active}`"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          enterkeyhint="done"
          :placeholder="searchPlaceholder"
          class="w-full rounded-lg border border-stone-200 bg-stone-50 py-2 pl-8 pr-8 text-xs outline-none focus:border-stone-900 focus:bg-white"
          @keydown="onKey"
        />
        <button
          v-if="query"
          type="button"
          class="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-stone-400 hover:text-stone-700"
          aria-label="Clear search"
          @click="query = ''; searchEl?.focus()"
        >
          <X :size="14" />
        </button>
      </div>

      <ul
        :id="listId"
        ref="listEl"
        role="listbox"
        class="max-h-64 overflow-y-auto overscroll-contain py-1 max-md:max-h-[45dvh]"
      >
        <template v-for="(o, i) in filtered" :key="o.value">
          <li
            v-if="showGroup(i)"
            class="sticky top-0 z-10 bg-stone-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-500"
            role="presentation"
          >
            {{ o.group }}
          </li>
          <li
            :id="`${listId}-${i}`"
            :data-index="i"
            role="option"
            :aria-selected="o.value === model"
            :class="[
              i === active ? 'bg-stone-100' : '',
              'flex min-h-11 cursor-pointer items-center gap-2 px-3 py-2 text-xs text-stone-800 max-md:text-sm',
            ]"
            @pointerenter="active = i"
            @click="choose(o.value)"
          >
            <span class="min-w-0 flex-1 truncate">{{ o.label }}</span>
            <span v-if="o.hint" class="shrink-0 text-[11px] text-stone-400">{{ o.hint }}</span>
            <Check v-if="o.value === model" :size="15" class="shrink-0 text-rose-600" />
          </li>
        </template>
        <li
          v-if="customValue"
          :id="`${listId}-${filtered.length}`"
          :data-index="filtered.length"
          role="option"
          :aria-selected="false"
          :class="[
            active === filtered.length ? 'bg-stone-100' : '',
            'flex min-h-11 cursor-pointer items-center px-3 py-2 text-xs font-semibold text-rose-700 max-md:text-sm',
          ]"
          @pointerenter="active = filtered.length"
          @click="choose(customValue)"
        >
          Use “{{ customValue }}”
        </li>
        <li v-if="!filtered.length && !customValue" class="px-3 py-4 text-center text-xs text-stone-500">
          No matches
        </li>
      </ul>
    </div>
  </div>
</template>
