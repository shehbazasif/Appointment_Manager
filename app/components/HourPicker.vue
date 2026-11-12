<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onBeforeUnmount, useId } from "vue";
import { Clock3, ChevronDown, Check } from "lucide-vue-next";

/**
 * Time picker: tap and choose from a list (every `step` minutes), or type an
 * exact time ("9:10", "0930", "7pm"). v-model is "HH:MM" (24h).
 * `from` (optional) shows the length next to each option, e.g. for a closing time.
 */
const model = defineModel<string>({ default: "09:00" });
const props = withDefaults(defineProps<{ step?: number; from?: string | null; invalid?: boolean; label?: string }>(), {
  step: 15,
  from: null,
  invalid: false,
  label: "",
});
const { t, intl } = useT();

const open = ref(false);
const typed = ref("");
const root = ref<HTMLElement | null>(null);
const list = ref<HTMLElement | null>(null);
const inputEl = ref<HTMLInputElement | null>(null);
const listId = useId();

const toMin = (v: string) => {
  const [h, m] = (v || "0:0").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};
const fromMin = (n: number) => `${String(Math.floor(n / 60) % 24).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;

// "9:00 AM" / "09:00" depending on the language
const display = (v: string) => {
  const d = new Date(2000, 0, 1, Math.floor(toMin(v) / 60), toMin(v) % 60);
  try {
    return new Intl.DateTimeFormat(intl.value, { hour: "numeric", minute: "2-digit" }).format(d);
  } catch {
    return v;
  }
};
const lengthHint = (v: string) => {
  if (!props.from) return "";
  const diff = toMin(v) - toMin(props.from);
  if (diff <= 0) return "";
  const h = Math.floor(diff / 60), m = diff % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
};

const options = computed(() => {
  const out: string[] = [];
  for (let n = 0; n < 1440; n += props.step) out.push(fromMin(n));
  if (model.value && !out.includes(model.value)) out.push(model.value);
  return out.sort((a, b) => toMin(a) - toMin(b));
});

/** Understands "9", "9:30", "09.30", "0930", "930", "7pm", "7:15 pm", "19h" */
const parseTyped = (raw: string): string | null => {
  const s = raw.trim().toLowerCase().replace(/\s+/g, "");
  if (!s) return null;
  const pm = /p\.?m?\.?$/.test(s) || s.endsWith("μμ") || s.endsWith("م");
  const am = /a\.?m?\.?$/.test(s) || s.endsWith("πμ") || s.endsWith("ص");
  const digits = s.replace(/[^\d:.h]/g, "").replace(/[.h]/g, ":");
  let h: number, m = 0;
  if (digits.includes(":")) {
    const [a, b] = digits.split(":");
    h = Number(a); m = Number(b || 0);
  } else if (digits.length >= 3) {
    h = Number(digits.slice(0, -2)); m = Number(digits.slice(-2));
  } else {
    h = Number(digits);
  }
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  if (pm && h < 12) h += 12;
  if (am && h === 12) h = 0;
  if (h > 23 || m > 59) return null;
  return fromMin(h * 60 + m);
};
const typedValue = computed(() => parseTyped(typed.value));

const scrollToSelected = () =>
  nextTick(() => list.value?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: "center" }));

const openMenu = async () => {
  open.value = true;
  typed.value = "";
  await nextTick();
  scrollToSelected();
  // focus the type box only on devices with a real keyboard (avoid popping the phone keyboard)
  if (window.matchMedia?.("(pointer: fine)").matches) inputEl.value?.focus();
};
const close = () => (open.value = false);
const pick = (v: string) => {
  model.value = v;
  close();
  root.value?.querySelector<HTMLButtonElement>("button")?.focus();
};
const onTypedEnter = () => {
  if (typedValue.value) pick(typedValue.value);
};
const onKey = (e: KeyboardEvent) => {
  if (e.key === "Escape") { e.preventDefault(); close(); }
  else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    const i = options.value.indexOf(model.value);
    const next = options.value[Math.min(options.value.length - 1, Math.max(0, i + (e.key === "ArrowDown" ? 1 : -1)))];
    if (next) { model.value = next; scrollToSelected(); }
  }
};
const onDocDown = (e: Event) => {
  if (open.value && root.value && !root.value.contains(e.target as Node)) close();
};
onMounted(() => document.addEventListener("pointerdown", onDocDown));
onBeforeUnmount(() => document.removeEventListener("pointerdown", onDocDown));
</script>

<template>
  <div ref="root" class="relative min-w-0">
    <button
      type="button"
      class="flex h-11 w-full min-w-0 items-center gap-2 rounded-xl border bg-white px-3 text-start text-sm font-semibold tabular-nums text-stone-900 transition hover:border-stone-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-stone-900/5 max-md:text-base"
      :class="[open ? 'border-stone-900 ring-4 ring-stone-900/5' : invalid ? 'border-rose-300 bg-rose-50/40' : 'border-stone-200']"
      :aria-expanded="open"
      :aria-controls="listId"
      aria-haspopup="listbox"
      :aria-label="label || undefined"
      @click="open ? close() : openMenu()"
      @keydown="onKey"
    >
      <Clock3 :size="15" class="shrink-0" :class="invalid ? 'text-rose-500' : 'text-stone-400'" />
      <span class="min-w-0 flex-1 truncate">{{ display(model) }}</span>
      <ChevronDown :size="15" class="shrink-0 text-stone-400 transition-transform duration-200" :class="open ? 'rotate-180' : ''" />
    </button>

    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
      leave-active-class="transition duration-100 ease-in"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <div
        v-if="open"
        class="absolute start-0 top-full z-50 mt-1.5 w-full min-w-52 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl shadow-stone-900/15"
        @keydown="onKey"
      >
        <div class="border-b border-stone-100 p-2">
          <input
            ref="inputEl"
            v-model="typed"
            type="text"
            inputmode="text"
            autocomplete="off"
            :placeholder="t('Type a time, e.g. 9:10')"
            class="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs outline-none focus:border-stone-900 focus:bg-white"
            @keydown.enter.prevent="onTypedEnter"
          />
          <button
            v-if="typed && typedValue"
            type="button"
            class="mt-1.5 flex w-full items-center justify-between rounded-xl bg-stone-900 px-3 py-2 text-xs font-bold text-white"
            @click="pick(typedValue)"
          >
            {{ t("Use {time}", { time: display(typedValue) }) }} <Check :size="14" />
          </button>
          <p v-else-if="typed" class="mt-1.5 px-1 text-[11px] text-rose-600">{{ t("Not a valid time") }}</p>
        </div>
        <ul :id="listId" ref="list" role="listbox" class="max-h-60 overflow-y-auto overscroll-contain p-1.5 max-md:max-h-[40dvh]">
          <li
            v-for="o in options"
            :key="o"
            role="option"
            :aria-selected="o === model"
            class="flex min-h-10 cursor-pointer items-center gap-2 rounded-xl px-3 text-sm tabular-nums transition-colors max-md:min-h-11"
            :class="o === model ? 'bg-stone-900 font-semibold text-white' : 'text-stone-700 hover:bg-stone-100'"
            @click="pick(o)"
          >
            <span class="flex-1">{{ display(o) }}</span>
            <span v-if="lengthHint(o)" class="text-[11px]" :class="o === model ? 'text-white/70' : 'text-stone-400'">{{ lengthHint(o) }}</span>
          </li>
        </ul>
      </div>
    </Transition>
  </div>
</template>
