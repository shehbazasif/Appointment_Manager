<script setup lang="ts">
// "⋯" button that opens a small menu (design system: ActionMenu).
// The menu is teleported to <body> so it is never clipped by a scrolling table.
import { ref, nextTick, onBeforeUnmount } from "vue";
import { Ellipsis } from "lucide-vue-next";

const props = withDefaults(defineProps<{ label?: string; size?: "sm" | "md" }>(), { label: "More actions", size: "sm" });
const open = ref(false);
const btn = ref<HTMLButtonElement | null>(null);
const menu = ref<HTMLElement | null>(null);
const pos = ref({ top: 0, left: 0 });

const place = () => {
  const b = btn.value?.getBoundingClientRect();
  const m = menu.value;
  if (!b || !m) return;
  const w = m.offsetWidth;
  const h = m.offsetHeight;
  const rtl = document.documentElement.dir === "rtl";
  let left = rtl ? b.left : b.right - w;
  left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
  let top = b.bottom + 6;
  if (top + h > window.innerHeight - 8) top = Math.max(8, b.top - h - 6);
  pos.value = { top, left };
};

const onDoc = (e: Event) => {
  const t = e.target as Node;
  if (menu.value?.contains(t) || btn.value?.contains(t)) return;
  close();
};
const onKey = (e: KeyboardEvent) => {
  if (e.key === "Escape") {
    close();
    btn.value?.focus();
  }
};
const listen = (on: boolean) => {
  const fn = on ? "addEventListener" : "removeEventListener";
  document[fn]("pointerdown", onDoc, true);
  document[fn]("keydown", onKey);
  window[fn]("scroll", close, true);
  window[fn]("resize", close);
};
function close() {
  if (!open.value) return;
  open.value = false;
  listen(false);
}
const toggle = async () => {
  if (open.value) return close();
  open.value = true;
  await nextTick();
  place();
  listen(true);
};
onBeforeUnmount(() => listen(false));
defineExpose({ close });
</script>

<template>
  <button
    ref="btn"
    type="button"
    :class="['ui-btn ui-btn-secondary ui-btn-icon', props.size === 'sm' ? 'ui-btn-sm' : '']"
    :aria-label="props.label"
    :title="props.label"
    aria-haspopup="menu"
    :aria-expanded="open"
    @click.stop="toggle"
  >
    <Ellipsis :size="16" />
  </button>
  <Teleport to="body">
    <div
      v-if="open"
      ref="menu"
      role="menu"
      class="ds-menu"
      :style="{ top: pos.top + 'px', left: pos.left + 'px' }"
      @click="close"
    >
      <slot />
    </div>
  </Teleport>
</template>
