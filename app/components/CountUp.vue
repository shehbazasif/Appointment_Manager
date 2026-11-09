<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";

/** Number that counts up once when it scrolls into view. SSR shows the final value. */
const props = withDefaults(defineProps<{ to: number; suffix?: string; prefix?: string; duration?: number }>(), {
  suffix: "",
  prefix: "",
  duration: 1400,
});
const value = ref(props.to);
const el = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;
let raf = 0;

onMounted(() => {
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
  const rect = el.value?.getBoundingClientRect();
  // Already on screen at load: leave the final number (no flicker).
  if (rect && rect.top < window.innerHeight) return;
  value.value = 0;
  observer = new IntersectionObserver(([entry]) => {
    if (!entry?.isIntersecting) return;
    observer?.disconnect();
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / props.duration);
      value.value = Math.round(props.to * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  });
  if (el.value) observer.observe(el.value);
});
onBeforeUnmount(() => {
  observer?.disconnect();
  cancelAnimationFrame(raf);
});
</script>

<template>
  <span ref="el" class="tabular-nums">{{ prefix }}{{ value.toLocaleString("en-US") }}{{ suffix }}</span>
</template>
