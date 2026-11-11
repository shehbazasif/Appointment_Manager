<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onBeforeUnmount, useSlots, useId, Fragment, type VNode } from "vue";
import { ChevronDown, Check, Search } from "lucide-vue-next";

/**
 * Drop-in replacement for <select>: keep the same <option> children and
 * v-model, get a styled dropdown. Long lists (> 8) get a search box.
 *   <AppSelect v-model="x" class="…same classes as the old select…">
 *     <option value="">All</option>
 *     <option v-for="s in list" :value="s.id">{{ s.name }}</option>
 *   </AppSelect>
 */
defineOptions({ inheritAttrs: false });
const model = defineModel<any>();
const props = withDefaults(defineProps<{ disabled?: boolean; required?: boolean; searchable?: boolean | null }>(), {
  disabled: false,
  required: false,
  searchable: null,
});
const slots = useSlots();
const { t } = useT();

interface Opt { value: any; label: string; disabled: boolean }

const textOf = (children: unknown): string => {
  if (children == null) return "";
  if (typeof children === "string" || typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map((c: any) => textOf(typeof c === "object" && c ? c.children : c)).join("");
  return "";
};
const collect = (nodes: VNode[] | undefined, out: Opt[] = []): Opt[] => {
  for (const n of nodes ?? []) {
    if (!n) continue;
    if (n.type === "option") {
      const p: any = n.props ?? {};
      const label = textOf(n.children).replace(/\s+/g, " ").trim();
      out.push({ value: "value" in p ? p.value : label, label, disabled: p.disabled === "" || p.disabled === true });
    } else if (n.type === Fragment || Array.isArray(n.children)) {
      collect(n.children as VNode[], out);
    }
  }
  return out;
};
const getOptions = () => collect(slots.default?.());

const open = ref(false);
const query = ref("");
const root = ref<HTMLElement | null>(null);
const list = ref<HTMLElement | null>(null);
const searchEl = ref<HTMLInputElement | null>(null);
const active = ref(0);
const listId = useId();

// eslint-disable-next-line eqeqeq
const same = (a: any, b: any) => a == b || (a === "" && b == null) || (a == null && b === "");

const visibleOptions = (all: Opt[]) => {
  const q = query.value.trim().toLowerCase();
  return q ? all.filter((o) => o.label.toLowerCase().includes(q)) : all;
};
const useSearch = (all: Opt[]) => (props.searchable ?? all.length > 8);

const openMenu = async () => {
  if (props.disabled) return;
  open.value = true;
  query.value = "";
  const all = getOptions();
  active.value = Math.max(0, all.findIndex((o) => same(o.value, model.value)));
  await nextTick();
  if (searchEl.value) searchEl.value.focus();
  else list.value?.focus();
  list.value?.querySelector<HTMLElement>(`[data-i="${active.value}"]`)?.scrollIntoView({ block: "nearest" });
};
const close = () => (open.value = false);
const pick = (o: Opt) => {
  if (o.disabled) return;
  model.value = o.value;
  close();
  root.value?.querySelector<HTMLButtonElement>("button")?.focus();
};
const onKey = (e: KeyboardEvent) => {
  const opts = visibleOptions(getOptions());
  if (e.key === "ArrowDown") { e.preventDefault(); active.value = Math.min(active.value + 1, opts.length - 1); }
  else if (e.key === "ArrowUp") { e.preventDefault(); active.value = Math.max(active.value - 1, 0); }
  else if (e.key === "Enter") { e.preventDefault(); const o = opts[active.value]; if (o) pick(o); }
  else if (e.key === "Escape" || e.key === "Tab") { close(); return; }
  else return;
  nextTick(() => list.value?.querySelector<HTMLElement>(`[data-i="${active.value}"]`)?.scrollIntoView({ block: "nearest" }));
};
const onDocDown = (e: Event) => {
  if (open.value && root.value && !root.value.contains(e.target as Node)) close();
};
onMounted(() => document.addEventListener("pointerdown", onDocDown));
onBeforeUnmount(() => document.removeEventListener("pointerdown", onDocDown));

const currentLabel = (all: Opt[]) => all.find((o) => same(o.value, model.value))?.label ?? "";
const isPlaceholder = (all: Opt[]) => {
  const o = all.find((x) => same(x.value, model.value));
  return !o || o.disabled || o.value === "";
};
</script>

<template>
  <div ref="root" class="relative min-w-0">
    <button
      v-bind="$attrs"
      type="button"
      :disabled="disabled"
      :aria-expanded="open"
      :aria-controls="listId"
      aria-haspopup="listbox"
      :aria-required="required || undefined"
      class="flex w-full items-center gap-2 text-start disabled:cursor-not-allowed disabled:opacity-60 max-md:text-base"
      :class="open ? '!border-stone-900 !bg-white ring-4 ring-stone-900/5' : ''"
      @click="open ? close() : openMenu()"
      @keydown.down.prevent="!open && openMenu()"
    >
      <span class="min-w-0 flex-1 truncate" :class="isPlaceholder(getOptions()) ? 'text-stone-500' : 'text-stone-900'">
        {{ currentLabel(getOptions()) || t("Select…") }}
      </span>
      <ChevronDown :size="16" class="shrink-0 text-stone-400 transition-transform duration-200" :class="open ? 'rotate-180 text-stone-700' : ''" />
    </button>

    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
      leave-active-class="transition duration-100 ease-in"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <div
        v-if="open"
        class="absolute start-0 top-full z-50 mt-1.5 w-full min-w-48 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl shadow-stone-900/15"
        @keydown="onKey"
      >
        <div v-if="useSearch(getOptions())" class="relative border-b border-stone-100 p-2">
          <Search :size="15" class="pointer-events-none absolute start-4.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            ref="searchEl"
            v-model="query"
            type="search"
            autocomplete="off"
            :placeholder="t('Type to search…')"
            class="w-full rounded-xl border border-stone-200 bg-stone-50 py-2 pe-3 ps-8 text-xs outline-none focus:border-stone-900 focus:bg-white"
            @input="active = 0"
          />
        </div>
        <ul :id="listId" ref="list" role="listbox" tabindex="-1" class="max-h-64 overflow-y-auto overscroll-contain p-1.5 outline-none max-md:max-h-[45dvh]">
          <li
            v-for="(o, i) in visibleOptions(getOptions())"
            :key="String(o.value) + i"
            :data-i="i"
            role="option"
            :aria-selected="same(o.value, model)"
            :aria-disabled="o.disabled || undefined"
            class="flex min-h-10 cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors max-md:min-h-11"
            :class="[
              o.disabled ? 'cursor-default text-stone-400' : same(o.value, model) ? 'bg-stone-900 font-semibold text-white' : i === active ? 'bg-stone-100 text-stone-900' : 'text-stone-700',
            ]"
            @pointerenter="!o.disabled && (active = i)"
            @click="pick(o)"
          >
            <span class="min-w-0 flex-1 truncate">{{ o.label }}</span>
            <Check v-if="same(o.value, model) && !o.disabled" :size="15" class="shrink-0" />
          </li>
          <li v-if="!visibleOptions(getOptions()).length" class="px-3 py-4 text-center text-xs text-stone-500">{{ t("No matches") }}</li>
        </ul>
      </div>
    </Transition>
  </div>
</template>
