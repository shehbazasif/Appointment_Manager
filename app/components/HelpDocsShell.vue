<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from "vue";
import { Search, Menu, X, ChevronRight, AlignLeft, ArrowUp, BookOpen } from "lucide-vue-next";

/**
 * Documentation layout (like Nuxt / Vue docs):
 * left sidebar with search + groups, content in the middle,
 * "On this page" table of contents with scroll-spy on the right.
 */
const props = defineProps<{
  toc?: { id: string; title: string }[];
  crumb?: string;
  title?: string;
}>();

const route = useRoute();
const query = ref("");
const searchEl = ref<HTMLInputElement | null>(null);
const drawer = ref(false);
const tocOpen = ref(false);
const activeId = ref("");

const isActive = (slug: string) =>
  route.path === `/help/${slug}` || (slug === "introduction" && route.path.replace(/\/$/, "") === "/help");

const results = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return [];
  return HELP_DOCS.flatMap((d) => {
    const hits: { to: string; title: string; sub: string }[] = [];
    if (`${d.title} ${d.description}`.toLowerCase().includes(q)) hits.push({ to: `/help/${d.slug}`, title: d.title, sub: d.group });
    for (const s of d.sections) {
      const text = `${s.title} ${s.blocks.map((b) => [b.p, b.tip, b.note, b.warning, ...(b.steps ?? []), ...(b.list ?? [])].join(" ")).join(" ")}`;
      if (text.toLowerCase().includes(q)) hits.push({ to: `/help/${d.slug}#${s.id}`, title: s.title, sub: d.title });
    }
    return hits;
  }).slice(0, 12);
});

watch(() => route.fullPath, () => {
  drawer.value = false;
  tocOpen.value = false;
  query.value = "";
  nextTick(setupSpy);
});
watch(drawer, (open) => {
  if (import.meta.client) document.documentElement.style.overflow = open ? "hidden" : "";
});

// Ctrl/⌘+K or "/" focuses search
const onKey = (e: KeyboardEvent) => {
  const typing = (e.target as HTMLElement)?.closest("input, textarea, select");
  if (((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") || (e.key === "/" && !typing)) {
    e.preventDefault();
    if (window.innerWidth < 1024) drawer.value = true;
    nextTick(() => searchEl.value?.focus());
  } else if (e.key === "Escape") {
    drawer.value = false;
    query.value = "";
  }
};

// scroll-spy
let spy: IntersectionObserver | null = null;
const setupSpy = () => {
  spy?.disconnect();
  if (!props.toc?.length) return;
  activeId.value = props.toc[0]!.id;
  spy = new IntersectionObserver(
    (entries) => {
      const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) activeId.value = visible[0].target.id;
    },
    { rootMargin: "-90px 0px -65% 0px" },
  );
  for (const t of props.toc) {
    const el = document.getElementById(t.id);
    if (el) spy.observe(el);
  }
};
onMounted(() => {
  window.addEventListener("keydown", onKey);
  setupSpy();
});
onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKey);
  spy?.disconnect();
  if (import.meta.client) document.documentElement.style.overflow = "";
});
const toTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
const isMac = ref(false);
onMounted(() => (isMac.value = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)));
</script>

<template>
  <div class="bg-white">
    <!-- Phone / tablet bar under the site header -->
    <div
      class="sticky z-30 flex h-12 items-center gap-2 border-b border-stone-200 bg-white/95 px-4 backdrop-blur lg:hidden"
      style="top: calc(4rem + env(safe-area-inset-top))"
    >
      <button type="button" class="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-stone-800" aria-label="Open docs menu" @click="drawer = true">
        <Menu :size="18" /> Menu
      </button>
      <ChevronRight :size="14" class="shrink-0 text-stone-300" />
      <span class="min-w-0 flex-1 truncate text-sm text-stone-500">{{ crumb }} <template v-if="title">/ <span class="font-medium text-stone-800">{{ title }}</span></template></span>
      <button v-if="toc?.length" type="button" class="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-stone-700 xl:hidden" :aria-expanded="tocOpen" @click="tocOpen = !tocOpen">
        <AlignLeft :size="16" /> On this page
      </button>
    </div>
    <!-- phone: on this page dropdown -->
    <div v-if="tocOpen && toc?.length" class="sticky z-20 border-b border-stone-200 bg-white px-4 py-2 shadow-sm lg:hidden" style="top: calc(7rem + env(safe-area-inset-top))">
      <a v-for="t in toc" :key="t.id" :href="`#${t.id}`" class="flex min-h-10 items-center text-sm text-stone-600" @click="tocOpen = false">{{ t.title }}</a>
    </div>

    <div class="mx-auto grid max-w-[88rem] lg:grid-cols-[17rem_minmax(0,1fr)] xl:grid-cols-[17rem_minmax(0,1fr)_14rem]">
      <!-- Sidebar (drawer on phone) -->
      <div v-if="drawer" class="fixed inset-0 z-[55] bg-stone-950/40 lg:hidden" aria-hidden="true" @click="drawer = false" />
      <aside
        class="fixed inset-y-0 left-0 z-[56] w-[86%] max-w-xs -translate-x-full overflow-y-auto overscroll-contain border-r border-stone-200 bg-white px-4 pb-10 transition-transform duration-200 lg:sticky lg:top-[calc(4rem+env(safe-area-inset-top))] lg:z-auto lg:block lg:h-[calc(100dvh-4rem-env(safe-area-inset-top))] lg:!pt-0 lg:w-auto lg:max-w-none lg:translate-x-0 lg:px-5 lg:pb-12 lg:transition-none"
        :class="drawer ? 'translate-x-0 shadow-2xl' : ''"
        style="padding-top: env(safe-area-inset-top)"
        aria-label="Documentation"
      >
        <div class="sticky top-0 z-10 -mx-4 bg-white px-4 pb-3 pt-4 lg:-mx-5 lg:px-5 lg:pt-8">
          <div class="mb-3 flex items-center justify-between lg:hidden">
            <span class="inline-flex items-center gap-2 text-sm font-bold text-stone-900"><BookOpen :size="16" class="text-rose-600" /> Help center</span>
            <button type="button" class="grid size-11 place-items-center rounded-lg text-stone-600" aria-label="Close docs menu" @click="drawer = false"><X :size="20" /></button>
          </div>
          <label class="relative block">
            <span class="sr-only">Search the docs</span>
            <Search :size="15" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              ref="searchEl"
              v-model="query"
              type="search"
              placeholder="Search docs…"
              autocomplete="off"
              class="h-10 w-full rounded-lg border border-stone-200 bg-stone-50 pl-9 pr-14 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-rose-400 focus:bg-white focus:ring-4 focus:ring-rose-100"
            />
            <kbd class="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-stone-200 bg-white px-1.5 py-0.5 font-sans text-[10px] font-semibold text-stone-400 lg:block">{{ isMac ? "⌘" : "Ctrl" }} K</kbd>
          </label>
        </div>

        <!-- search results -->
        <div v-if="query.trim()" class="mt-1">
          <p class="px-2 pb-2 text-xs font-semibold text-stone-400">{{ results.length ? `${results.length} result${results.length > 1 ? "s" : ""}` : "No results" }}</p>
          <NuxtLink
            v-for="r in results"
            :key="r.to"
            :to="r.to"
            class="block rounded-lg px-2 py-2 hover:bg-stone-50"
            @click="query = ''; drawer = false"
          >
            <span class="block text-sm font-medium text-stone-900">{{ r.title }}</span>
            <span class="block text-xs text-stone-500">{{ r.sub }}</span>
          </NuxtLink>
        </div>

        <!-- groups -->
        <nav v-else class="mt-1 space-y-6">
          <div v-for="g in HELP_GROUPS" :key="g">
            <p class="px-2 text-xs font-semibold uppercase tracking-wider text-stone-900">{{ g }}</p>
            <ul class="mt-2 space-y-px border-l border-stone-200">
              <li v-for="d in HELP_DOCS.filter((x) => x.group === g)" :key="d.slug">
                <NuxtLink
                  :to="d.slug === 'introduction' ? '/help' : `/help/${d.slug}`"
                  class="-ml-px flex min-h-9 items-center border-l pl-4 text-sm transition-colors"
                  :class="isActive(d.slug) ? 'border-rose-600 font-semibold text-rose-600' : 'border-transparent text-stone-600 hover:border-stone-400 hover:text-stone-900'"
                >
                  {{ d.title }}
                </NuxtLink>
              </li>
            </ul>
          </div>
        </nav>
      </aside>

      <!-- Content -->
      <main class="min-w-0 px-4 pb-20 pt-8 sm:px-8 lg:border-l lg:border-stone-100 lg:px-12 lg:pt-10 xl:px-14">
        <slot />
      </main>

      <!-- On this page -->
      <aside v-if="toc?.length" class="hidden xl:block">
        <div class="sticky top-[calc(4rem+env(safe-area-inset-top))] max-h-[calc(100dvh-4rem)] overflow-y-auto py-10 pr-6">
          <p class="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-900"><AlignLeft :size="14" /> On this page</p>
          <ul class="mt-3 space-y-px border-l border-stone-200">
            <li v-for="t in toc" :key="t.id">
              <a
                :href="`#${t.id}`"
                class="-ml-px block border-l py-1.5 pl-4 text-[13px] leading-5 transition-colors"
                :class="activeId === t.id ? 'border-rose-600 font-medium text-rose-600' : 'border-transparent text-stone-500 hover:text-stone-900'"
              >{{ t.title }}</a>
            </li>
          </ul>
          <button type="button" class="mt-6 inline-flex items-center gap-1.5 text-[13px] text-stone-500 hover:text-stone-900" @click="toTop">
            <ArrowUp :size="14" /> Back to top
          </button>
          <div class="mt-8 rounded-xl border border-stone-200 bg-stone-50 p-4">
            <p class="text-[13px] font-semibold text-stone-900">Need a hand?</p>
            <p class="mt-1 text-xs leading-5 text-stone-500">A real person will help you set things up.</p>
            <NuxtLink to="/contactus" class="mt-3 inline-flex text-xs font-semibold text-rose-600 hover:underline">Contact support →</NuxtLink>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>
