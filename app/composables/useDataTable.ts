import { reactive, ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from "vue";

export interface TableColumn<K extends string = string> {
  key: K;
  label: string;
  /** shown by default */
  on: boolean;
}

/**
 * Design-system DataTable helpers:
 * - which optional columns are shown (saved on this device under `storageKey`)
 * - shadows on the pinned first/last columns while the table scrolls sideways
 */
export function useDataTable<K extends string>(storageKey: string, columns: TableColumn<K>[]) {
  const defaults = () => Object.fromEntries(columns.map((c) => [c.key, c.on])) as Record<K, boolean>;
  const visible = reactive(defaults()) as Record<K, boolean>;

  onMounted(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null");
      if (saved && typeof saved === "object") {
        for (const c of columns) if (typeof saved[c.key] === "boolean") visible[c.key] = saved[c.key];
      }
    } catch {}
  });

  const wrap = ref<HTMLElement | null>(null);
  const scrolledX = ref(false);
  const canScrollX = ref(false);
  const measure = () => {
    const el = wrap.value;
    if (!el) return;
    const x = Math.abs(el.scrollLeft);
    scrolledX.value = x > 2;
    canScrollX.value = el.scrollWidth - el.clientWidth - x > 2;
  };

  const save = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(visible));
    } catch {}
    nextTick(measure);
  };
  const toggle = (k: K) => {
    visible[k] = !visible[k];
    save();
  };
  const reset = () => {
    Object.assign(visible, defaults());
    save();
  };

  let ro: ResizeObserver | null = null;
  watch(wrap, (el) => {
    ro?.disconnect();
    if (el && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(measure);
      ro.observe(el);
      const tbl = el.querySelector("table");
      if (tbl) ro.observe(tbl);
    }
    nextTick(measure);
  });
  onBeforeUnmount(() => ro?.disconnect());

  return { columns, visible, toggle, reset, wrap, scrolledX, canScrollX, onScroll: measure };
}

/** Two-letter initials for an avatar ("Customer" placeholder last names are skipped). */
export const initialsOf = (first?: string | null, last?: string | null) =>
  (((first ?? "").trim()[0] ?? "") + (last && last !== "Customer" ? last.trim()[0] ?? "" : "")).toUpperCase() || "?";

/**
 * Client-side pagination for a list (page size saved on this device).
 * Page size "auto" (the default) shows as many table rows as fit in the
 * window, so the pager is visible without scrolling. Pass the table's
 * wrapper element (`wrap`) so the space can be measured.
 * Goes back to page 1 whenever the list changes length (search / filter).
 */
export type PageSize = "auto" | 10 | 25 | 50 | 100;
export function usePager<T>(
  list: import("vue").Ref<T[]> | import("vue").ComputedRef<T[]>,
  storageKey = "table_page_size",
  wrap?: import("vue").Ref<HTMLElement | null>,
) {
  const page = ref(1);
  const pageSize = ref<PageSize>("auto");
  const fitRows = ref(10);
  const isDesktop = ref(false);

  // room below the table: its footer/pager (~60px) + page bottom padding (~40px)
  const RESERVE = 104;
  const measure = () => {
    if (!import.meta.client) return;
    isDesktop.value = window.matchMedia("(min-width: 1024px)").matches;
    const el = wrap?.value;
    if (!el || !el.offsetParent) return;
    const top = el.getBoundingClientRect().top;
    const head = el.querySelector("thead")?.getBoundingClientRect().height ?? 41;
    const rowH = el.querySelector("tbody tr")?.getBoundingClientRect().height || 60;
    const n = Math.floor((window.innerHeight - top - head - RESERVE) / rowH);
    fitRows.value = Math.min(50, Math.max(5, n));
  };
  const onResize = () => measure();
  onMounted(() => {
    try {
      const v = localStorage.getItem(storageKey);
      if (v === "auto") pageSize.value = "auto";
      else if ([10, 25, 50, 100].includes(Number(v))) pageSize.value = Number(v) as PageSize;
    } catch {}
    measure();
    window.addEventListener("resize", onResize);
  });
  onBeforeUnmount(() => {
    if (import.meta.client) window.removeEventListener("resize", onResize);
  });
  if (wrap) watch(wrap, () => nextTick(measure));
  // re-measure once real rows are on screen (row height known)
  watch(
    () => list.value.length,
    () => {
      page.value = 1;
      nextTick(measure);
    },
  );

  watch(pageSize, (n) => {
    if (n !== "auto" && typeof n !== "number") pageSize.value = (n === "auto" ? "auto" : Number(n) || "auto") as PageSize;
    page.value = 1;
    try {
      localStorage.setItem(storageKey, String(pageSize.value));
    } catch {}
    nextTick(measure);
  });

  /** rows per page actually used (auto: what fits on desktop, 10 cards on phones) */
  const size = computed(() => (pageSize.value === "auto" ? (isDesktop.value ? fitRows.value : 10) : pageSize.value));
  const total = computed(() => list.value.length);
  const pages = computed(() => Math.max(1, Math.ceil(total.value / size.value)));
  watch(pages, (p) => {
    if (page.value > p) page.value = p;
  });
  const rows = computed(() => list.value.slice((page.value - 1) * size.value, page.value * size.value));
  const from = computed(() => (total.value ? (page.value - 1) * size.value + 1 : 0));
  const to = computed(() => Math.min(total.value, page.value * size.value));
  return reactive({ page, pageSize, size, total, pages, rows, from, to });
}
