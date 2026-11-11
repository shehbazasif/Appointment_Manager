<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick, useId } from "vue";
import { Languages, ChevronDown, Check, Building2 } from "lucide-vue-next";

/**
 * Language picker (custom menu). Remembers the choice on this device;
 * "Business language" follows the business setting again.
 */
const props = withDefaults(defineProps<{ businessLanguage?: string | null; compact?: boolean }>(), {
  businessLanguage: null,
  compact: false,
});
const { t, locale } = useT();
const own = useCookie<string | null>(LANG_COOKIE);
// what this person picked in this menu (null = not picked yet)
const choice = ref<string | null>(null);
const selected = computed(() =>
  choice.value ?? (isLocale(own.value) ? own.value : props.businessLanguage ? "business" : locale.value),
);

const open = ref(false);
const root = ref<HTMLElement | null>(null);
const menu = ref<HTMLElement | null>(null);
const menuId = useId();

const options = computed(() => [
  ...(props.businessLanguage ? [{ value: "business", code: localeInfo(props.businessLanguage).code, name: t("Business language"), sub: localeInfo(props.businessLanguage).name, isBusiness: true }] : []),
  ...LOCALES.map((l) => ({ value: l.code as string, code: l.code as string, name: l.name as string, sub: l.english as string, isBusiness: false })),
]);

const toggle = async () => {
  open.value = !open.value;
  if (open.value) {
    await nextTick();
    (menu.value?.querySelector<HTMLElement>('[aria-checked="true"]') ?? menu.value?.querySelector<HTMLElement>("[role=menuitemradio]"))?.focus();
  }
};
const pick = async (v: string) => {
  choice.value = v;
  open.value = false;
  if (v === "business") await followBusinessLocale(props.businessLanguage);
  else if (isLocale(v)) await chooseLocale(v);
};

// keyboard: arrows move, Esc closes
const onMenuKey = (e: KeyboardEvent) => {
  const items = [...(menu.value?.querySelectorAll<HTMLElement>("[role=menuitemradio]") ?? [])];
  const i = items.indexOf(document.activeElement as HTMLElement);
  if (e.key === "ArrowDown") { e.preventDefault(); items[(i + 1) % items.length]?.focus(); }
  else if (e.key === "ArrowUp") { e.preventDefault(); items[(i - 1 + items.length) % items.length]?.focus(); }
  else if (e.key === "Escape") { e.preventDefault(); open.value = false; root.value?.querySelector("button")?.focus(); }
  else if (e.key === "Tab") open.value = false;
};
const onDocDown = (e: Event) => {
  if (open.value && root.value && !root.value.contains(e.target as Node)) open.value = false;
};
onMounted(() => document.addEventListener("pointerdown", onDocDown));
onBeforeUnmount(() => document.removeEventListener("pointerdown", onDocDown));
</script>

<template>
  <div ref="root" class="relative">
    <button
      type="button"
      class="inline-flex items-center gap-1.5 rounded-xl border-2 text-xs font-bold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-100"
      :class="[
        compact ? 'h-9 px-2 sm:px-2.5' : 'h-10 px-3',
        open ? 'border-sky-400 bg-sky-100 text-sky-900' : 'border-sky-200 bg-sky-50 text-sky-800 hover:border-sky-400 hover:bg-sky-100',
      ]"
      :aria-expanded="open"
      :aria-controls="menuId"
      aria-haspopup="menu"
      :title="t('Language')"
      @click="toggle"
      @keydown.down.prevent="!open && toggle()"
    >
      <Languages :size="16" class="shrink-0 text-sky-600" />
      <span :class="compact ? 'hidden sm:inline' : ''">{{ localeInfo(locale).name }}</span>
      <span v-if="compact" class="text-[10px] font-black uppercase tracking-wide sm:hidden">{{ locale }}</span>
      <ChevronDown :size="14" class="shrink-0 text-sky-500 transition-transform duration-200" :class="open ? 'rotate-180' : ''" />
    </button>

    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 -translate-y-1 scale-95"
      leave-active-class="transition duration-100 ease-in"
      leave-to-class="opacity-0 -translate-y-1 scale-95"
    >
      <div
        v-if="open"
        :id="menuId"
        ref="menu"
        role="menu"
        :aria-label="t('Language')"
        class="absolute end-0 top-full z-50 mt-2 w-64 origin-top-right overflow-hidden rounded-2xl border border-stone-200 bg-white p-1.5 shadow-2xl shadow-stone-900/15 rtl:origin-top-left"
        @keydown="onMenuKey"
      >
        <p class="px-3 pb-1.5 pt-2 text-[10px] font-bold uppercase tracking-wider text-stone-400">{{ t("Language") }}</p>
        <template v-for="o in options" :key="o.value">
          <button
            type="button"
            role="menuitemradio"
            :aria-checked="selected === o.value"
            class="group flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-start outline-none transition focus-visible:bg-stone-100"
            :class="selected === o.value ? 'bg-sky-50' : 'hover:bg-stone-50'"
            @click="pick(o.value)"
          >
            <span
              class="grid size-8 shrink-0 place-items-center rounded-lg text-[11px] font-black uppercase"
              :class="o.isBusiness ? 'bg-stone-900 text-white' : selected === o.value ? 'bg-sky-600 text-white' : 'bg-stone-100 text-stone-600 group-hover:bg-stone-200'"
            >
              <Building2 v-if="o.isBusiness" :size="15" />
              <template v-else>{{ o.code }}</template>
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-semibold text-stone-900">{{ o.name }}</span>
              <span class="block truncate text-[11px] text-stone-500">{{ o.sub }}</span>
            </span>
            <Check v-if="selected === o.value" :size="16" class="shrink-0 text-sky-600" />
          </button>
          <div v-if="o.isBusiness" class="mx-2.5 my-1 h-px bg-stone-100" />
        </template>
      </div>
    </Transition>
  </div>
</template>
