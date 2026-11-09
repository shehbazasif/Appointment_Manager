/**
 * v-reveal: fade / slide elements in when they scroll into view.
 *   <div v-reveal>…</div>          default
 *   <div v-reveal="120">…</div>    with a 120 ms delay (for staggered cards)
 * Uses one shared IntersectionObserver and only CSS opacity/transform
 * (see `[data-reveal]` in tailwind.css). Reduced-motion users see everything
 * immediately. Without JavaScript nothing is hidden (the `js-reveal` class on
 * <html> is only added by a script).
 */
export default defineNuxtPlugin((nuxtApp) => {
  let observer: IntersectionObserver | null = null;

  const getObserver = () => {
    observer ??= new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-visible");
          observer?.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    return observer;
  };

  nuxtApp.vueApp.directive<HTMLElement, number | string | undefined>("reveal", {
    getSSRProps: (binding) => ({
      "data-reveal": "",
      style: binding.value ? `--reveal-delay:${Number(binding.value)}ms` : undefined,
    }),
    mounted(el, binding) {
      el.setAttribute("data-reveal", "");
      if (binding.value) el.style.setProperty("--reveal-delay", `${Number(binding.value)}ms`);
      const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      if (reduce || !("IntersectionObserver" in window)) {
        el.classList.add("is-visible");
        return;
      }
      getObserver().observe(el);
    },
    unmounted(el) {
      observer?.unobserve(el);
    },
  });
});
