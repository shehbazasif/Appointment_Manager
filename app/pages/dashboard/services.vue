<script setup lang="ts">
import { ref, reactive, computed, onMounted, inject, type Ref } from "vue";
import {
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  Clock,
  Tag,
  Check,
  X,
  AlertCircle,
  Search,
  Eye,
  EyeOff,
} from "lucide-vue-next";
const { t } = useT();

definePageMeta({
  layout: "dashboard",
});

interface ServiceItem {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  durationMinutes: number;
  priceCents: number;
  currency?: string;
  active: boolean;
  accent: string;
}

const services = ref<ServiceItem[]>([]);
const isLoading = ref(true);
const showCreateModal = ref(false);
const showEditModal = ref(false);
const selectedService = ref<ServiceItem | null>(null);

const isSubmitting = ref(false);
const formError = ref("");

const serviceForm = reactive({
  name: "",
  description: "",
  category: "Hair",
  durationMinutes: 45,
  priceEur: "25.00",
  currency: "EUR",
  accent: "#ca7481",
  active: true,
});

// Searchable currency list (business currency first)
const currencyOptions = computed(() => {
  const own = businessCurrency.value;
  const codes = [own, ...CURRENCIES.filter((c) => c !== own)];
  if (serviceForm.currency && !codes.includes(serviceForm.currency)) codes.unshift(serviceForm.currency);
  return codes.map((c) => ({ value: c, label: c, hint: currencyName(c), keywords: currencyName(c) }));
});

// Business currency (Settings) is the default for new services
const businessProfile = inject<Ref<any> | null>("businessProfile", null);
const businessCurrency = computed(
  () => businessProfile?.value?.organization?.currency || "EUR",
);

// ---- Categories (create / remove; removing moves services to "General") ----
const categories = ref<string[]>(["General"]);
const categoriesEnabled = ref(true);
const newCategory = ref("");
const categoryBusy = ref(false);
const categoryError = ref("");
const NEW_CATEGORY = "__new__";
const customCategory = ref("");

const loadCategories = async () => {
  try {
    const r = await $fetch<{ enabled: boolean; categories: string[] }>("/api/service-categories");
    categoriesEnabled.value = r.enabled;
    categories.value = r.categories.length ? r.categories : ["General"];
  } catch {
    categoriesEnabled.value = false;
  }
};

const addCategory = async () => {
  const name = newCategory.value.trim();
  if (!name) return;
  categoryBusy.value = true;
  categoryError.value = "";
  try {
    const r = await $fetch<{ categories: string[] }>("/api/service-categories", {
      method: "POST",
      body: { name },
    });
    categories.value = r.categories;
    newCategory.value = "";
  } catch (err: any) {
    categoryError.value = err?.data?.statusMessage ?? t("Could not add the category.");
  } finally {
    categoryBusy.value = false;
  }
};

const removeCategory = async (name: string) => {
  const count = services.value.filter((s) => (s.category || "General") === name).length;
  const msg = count
    ? t('Remove the category "{name}"? Its {count} service(s) will move to "General".', { name, count })
    : t('Remove the category "{name}"?', { name });
  if (!confirm(msg)) return;
  categoryBusy.value = true;
  categoryError.value = "";
  try {
    const r = await $fetch<{ categories: string[] }>("/api/service-categories", {
      method: "DELETE",
      query: { name },
    });
    categories.value = r.categories;
    await loadServices();
  } catch (err: any) {
    categoryError.value = err?.data?.statusMessage ?? t("Could not remove the category.");
  } finally {
    categoryBusy.value = false;
  }
};

// Category chosen in the service form ("+ New category" lets you type one)
const resolvedCategory = () =>
  serviceForm.category === NEW_CATEGORY
    ? customCategory.value.trim()
    : serviceForm.category.trim();

const defaultAccents = [
  "#ca7481", // Rose
  "#4f998e", // Teal
  "#817eb1", // Violet
  "#c7944e", // Amber
  "#3b82f6", // Blue
  "#10b981", // Emerald
];

const loadServices = async () => {
  isLoading.value = true;
  try {
    services.value = await $fetch<ServiceItem[]>("/api/services");
  } catch (err: any) {
    console.error("Failed to load services", err);
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  loadServices();
  loadCategories();
});

// Group services by category (created-but-empty categories are shown too)
const groupedServices = computed(() => {
  const groups: Record<string, ServiceItem[]> = {};
  for (const c of categories.value) if (c !== "General") groups[c] = [];
  for (const s of services.value) {
    const cat = s.category || "General";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(s);
  }
  return groups;
});
const hasAnyGroup = computed(() => Object.keys(groupedServices.value).length > 0);

const openCreate = () => {
  serviceForm.name = "";
  serviceForm.description = "";
  serviceForm.category = categories.value[0] ?? "General";
  customCategory.value = "";
  serviceForm.durationMinutes = 45;
  serviceForm.priceEur = "25.00";
  serviceForm.currency = businessCurrency.value;
  serviceForm.accent = "#ca7481";
  serviceForm.active = true;
  formError.value = "";
  showCreateModal.value = true;
};

const handleCreate = async () => {
  if (!serviceForm.name.trim() || !resolvedCategory()) {
    formError.value = t("Name and category are required.");
    return;
  }
  const priceNum = parseFloat(serviceForm.priceEur);
  if (isNaN(priceNum) || priceNum < 0) {
    formError.value = t("Please enter a valid price.");
    return;
  }

  isSubmitting.value = true;
  formError.value = "";
  try {
    await $fetch("/api/services", {
      method: "POST",
      body: {
        name: serviceForm.name.trim(),
        description: serviceForm.description.trim() || undefined,
        category: resolvedCategory() || "General",
        durationMinutes: Number(serviceForm.durationMinutes),
        priceCents: Math.round(priceNum * 100),
        currency: serviceForm.currency,
        accent: serviceForm.accent,
        active: serviceForm.active,
      },
    });
    showCreateModal.value = false;
    await Promise.all([loadServices(), loadCategories()]);
  } catch (err: any) {
    formError.value = err?.data?.statusMessage ?? t(t("Failed to create service."));
  } finally {
    isSubmitting.value = false;
  }
};

const openEdit = (s: ServiceItem) => {
  selectedService.value = s;
  serviceForm.name = s.name;
  serviceForm.description = s.description ?? "";
  serviceForm.category = s.category || "General";
  customCategory.value = "";
  if (!categories.value.includes(serviceForm.category))
    categories.value = [...categories.value, serviceForm.category];
  serviceForm.currency = s.currency || businessCurrency.value;
  serviceForm.durationMinutes = s.durationMinutes;
  serviceForm.priceEur = (s.priceCents / 100).toFixed(2);
  serviceForm.accent = s.accent || "#ca7481";
  serviceForm.active = s.active;
  formError.value = "";
  showEditModal.value = true;
};

const handleEdit = async () => {
  if (!selectedService.value) return;
  const priceNum = parseFloat(serviceForm.priceEur);
  if (isNaN(priceNum) || priceNum < 0) {
    formError.value = t("Please enter a valid price.");
    return;
  }

  isSubmitting.value = true;
  formError.value = "";
  try {
    await $fetch(`/api/services/${selectedService.value.id}`, {
      method: "PATCH",
      body: {
        name: serviceForm.name.trim(),
        description: serviceForm.description.trim() || undefined,
        category: resolvedCategory() || "General",
        durationMinutes: Number(serviceForm.durationMinutes),
        priceCents: Math.round(priceNum * 100),
        currency: serviceForm.currency,
        accent: serviceForm.accent,
        active: serviceForm.active,
      },
    });
    showEditModal.value = false;
    await Promise.all([loadServices(), loadCategories()]);
  } catch (err: any) {
    formError.value = err?.data?.statusMessage ?? t(t("Failed to update service."));
  } finally {
    isSubmitting.value = false;
  }
};

const toggleActive = async (s: ServiceItem) => {
  try {
    await $fetch(`/api/services/${s.id}`, {
      method: "PATCH",
      body: { active: !s.active },
    });
    await loadServices();
  } catch (err: any) {
    alert(err?.data?.statusMessage ?? t(t("Failed to toggle status.")));
  }
};

const deleteService = async (s: ServiceItem) => {
  if (!confirm(t('Are you sure you want to deactivate / archive "{name}"?', { name: s.name }))) return;
  try {
    await $fetch(`/api/services/${s.id}`, {
      method: "DELETE",
    });
    await loadServices();
  } catch (err: any) {
    alert(err?.data?.statusMessage ?? t(t("Failed to delete service.")));
  }
};
// Design-system table: category tabs, search, optional columns
const showCategories = ref(false);
const svcTab = ref("ALL");
const svcSearch = ref("");
const categoryTabs = computed(() => [
  { value: "ALL", label: t("All"), count: services.value.length },
  ...Object.entries(groupedServices.value).map(([name, list]) => ({
    value: name,
    label: name === "General" ? t("General") : name,
    count: list.length,
  })),
]);
const filteredServices = computed(() => {
  const q = svcSearch.value.trim().toLowerCase();
  const list = svcTab.value === "ALL" ? services.value : (groupedServices.value[svcTab.value] ?? []);
  return list.filter((s) => !q || s.name.toLowerCase().includes(q) || (s.description ?? "").toLowerCase().includes(q));
});
const table = useDataTable("services_table_cols", [
  { key: "category", label: "Category", on: true },
  { key: "description", label: "Description", on: false },
]);
</script>

<template>
  <div class="space-y-5 pb-16">
    <!-- Header -->
    <div class="ds-page-head">
      <div class="min-w-0">
        <h1 class="ds-page-title">{{ t("Services") }}</h1>
        <p class="ds-page-sub">{{ t("What customers can book, how long it takes and what it costs.") }}</p>
      </div>
      <div class="flex w-full flex-wrap items-center gap-2 sm:w-auto">
        <button type="button" class="ui-btn ui-btn-secondary flex-1 sm:flex-none" :aria-expanded="showCategories" @click="showCategories = !showCategories">
          <Tag :size="16" />
          <span>{{ t("Categories") }}</span>
        </button>
        <button type="button" class="ui-btn ui-btn-primary flex-1 sm:flex-none" @click="openCreate">
          <Plus :size="16" />
          <span>{{ t("Add Service") }}</span>
        </button>
      </div>
    </div>

    <!-- Category manager (opens from the header) -->
    <div v-if="showCategories" class="ds-card space-y-3 p-4">
      <div class="flex items-center justify-between gap-2">
        <div>
          <h2 class="ds-section-title">{{ t("Categories") }}</h2>
          <p class="ds-section-sub">{{ t("Group your services, e.g. Check-ups, Vaccines, Grooming.") }}</p>
        </div>
        <button type="button" class="ui-btn ui-btn-ghost ui-btn-icon" :aria-label="t('Close')" @click="showCategories = false">
          <X :size="18" />
        </button>
      </div>
      <p v-if="!categoriesEnabled" class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[13px] text-amber-800">
        {{ t("Categories need a small database update first (scripts/service-categories.sql). Until then all services stay in \"General\".") }}
      </p>
      <template v-else>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="c in categories"
            :key="c"
            class="inline-flex h-8 items-center gap-1 rounded-full border border-stone-200 bg-stone-50 ps-3 pe-1 text-[13px] font-medium text-stone-800"
          >
            {{ c === "General" ? t("General") : c }}
            <button
              v-if="c !== 'General'"
              type="button"
              :disabled="categoryBusy"
              class="grid size-6 place-items-center rounded-full text-stone-400 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
              :aria-label="t('Remove {name}', { name: c })"
              @click="removeCategory(c)"
            >
              <X :size="14" />
            </button>
            <span v-else class="pe-2"></span>
          </span>
        </div>
        <form class="flex gap-2" @submit.prevent="addCategory">
          <input v-model="newCategory" type="text" maxlength="60" :placeholder="t('New category, e.g. Nails')" class="min-w-0 flex-1 px-3 sm:max-w-xs" />
          <button type="submit" class="ui-btn ui-btn-secondary" :disabled="categoryBusy || !newCategory.trim()">
            <Plus :size="16" />
            <span>{{ t("Add") }}</span>
          </button>
        </form>
        <p v-if="categoryError" class="text-[13px] font-medium text-red-700">{{ categoryError }}</p>
      </template>
    </div>

    <div class="ds-card">
      <!-- Category tabs -->
      <div class="ds-tabs" role="tablist">
        <button
          v-for="tab in categoryTabs"
          :key="tab.value"
          type="button"
          role="tab"
          :aria-selected="svcTab === tab.value"
          :class="['ds-tab', svcTab === tab.value ? 'is-active' : '']"
          @click="svcTab = tab.value"
        >
          {{ tab.label }}
          <span class="count">{{ tab.count }}</span>
        </button>
      </div>

      <!-- Toolbar -->
      <div class="ds-toolbar">
        <div class="relative min-w-0 flex-1 md:max-w-sm">
          <Search :size="16" class="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input v-model="svcSearch" type="search" enterkeyhint="search" :placeholder="t('Search services...')" class="w-full ps-9 pe-3" />
        </div>
        <div class="ms-auto hidden lg:block">
          <ColumnPicker :columns="table.columns" :visible="table.visible" @toggle="table.toggle" @reset="table.reset" />
        </div>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="space-y-2 p-4">
        <div v-for="i in 4" :key="i" class="h-12 animate-pulse rounded-lg bg-stone-100"></div>
      </div>

      <!-- Empty -->
      <div v-else-if="services.length === 0" class="px-4 py-16 text-center">
        <span class="mx-auto grid size-12 place-items-center rounded-full bg-stone-100 text-stone-500">
          <Sparkles :size="22" />
        </span>
        <h3 class="mt-3 text-base font-semibold text-stone-900">{{ t("No services created") }}</h3>
        <p class="mx-auto mt-1 max-w-sm text-sm text-stone-500">
          {{ t("Configure the treatments, haircuts, and sessions you offer to customers.") }}
        </p>
        <button type="button" class="ui-btn ui-btn-primary mt-4" @click="openCreate">
          <Plus :size="16" />
          <span>{{ t("Create First Service") }}</span>
        </button>
      </div>

      <div v-else-if="filteredServices.length === 0" class="px-4 py-12 text-center text-sm text-stone-500">
        <template v-if="svcTab !== 'ALL' && !svcSearch.trim()">
          {{ t('No services in this category yet. Add a service and choose "{category}".', { category: svcTab === "General" ? t("General") : svcTab }) }}
        </template>
        <template v-else>{{ t("No services match this search.") }}</template>
      </div>

      <template v-else>
        <!-- Desktop: data table -->
        <div
          :ref="(el) => (table.wrap.value = el as HTMLElement | null)"
          :class="['ds-table-wrap hidden lg:block', table.scrolledX.value ? 'is-scrolled-x' : '', table.canScrollX.value ? 'can-scroll-x' : '']"
          @scroll="table.onScroll"
        >
          <table class="ds-table">
            <thead>
              <tr>
                <th class="sticky-start">{{ t("Service") }}</th>
                <th v-if="table.visible.category">{{ t("Category") }}</th>
                <th>{{ t("Duration") }}</th>
                <th class="text-end">{{ t("Price") }}</th>
                <th v-if="table.visible.description">{{ t("Description") }}</th>
                <th>{{ t("Bookable") }}</th>
                <th class="sticky-end text-end">{{ t("Actions") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in filteredServices" :key="s.id" :class="s.active ? '' : 'opacity-60'">
                <td class="sticky-start">
                  <div class="flex items-center gap-3">
                    <span class="size-2.5 shrink-0 rounded-full" :style="{ backgroundColor: s.accent || '#94a3b8' }"></span>
                    <span class="is-strong max-w-[18rem] truncate">{{ s.name }}</span>
                  </div>
                </td>
                <td v-if="table.visible.category"><span class="ds-tag">{{ s.category === "General" || !s.category ? t("General") : s.category }}</span></td>
                <td class="num">{{ t("{n} min", { n: s.durationMinutes }) }}</td>
                <td class="num text-end text-stone-800">{{ formatMoney(s.priceCents, s.currency) }}</td>
                <td v-if="table.visible.description" class="max-w-[20rem] truncate" :title="s.description ?? ''">{{ s.description || "—" }}</td>
                <td>
                  <div class="flex items-center gap-2">
                    <AppSwitch :model-value="s.active" :label="t('Shown on booking page')" @update:model-value="toggleActive(s)" />
                    <span class="text-xs" :class="s.active ? 'text-emerald-700' : 'text-stone-500'">{{ s.active ? t("Active") : t("Hidden") }}</span>
                  </div>
                </td>
                <td class="sticky-end">
                  <div class="flex items-center justify-end gap-1.5">
                    <button type="button" class="ui-btn ui-btn-sm ui-btn-soft" @click="openEdit(s)">
                      <Edit2 :size="14" /> {{ t("Edit") }}
                    </button>
                    <RowActionMenu :label="t('More actions')">
                      <button type="button" class="ds-menu-item" role="menuitem" @click="openEdit(s)">
                        <Edit2 :size="16" /> {{ t("Edit Service") }}
                      </button>
                      <button type="button" class="ds-menu-item" role="menuitem" @click="toggleActive(s)">
                        <component :is="s.active ? EyeOff : Eye" :size="16" /> {{ s.active ? t("Hide from booking page") : t("Show on booking page") }}
                      </button>
                      <div class="ds-menu-sep"></div>
                      <button type="button" class="ds-menu-item ds-menu-item--danger" role="menuitem" @click="deleteService(s)">
                        <Trash2 :size="16" /> {{ t("Deactivate Service") }}
                      </button>
                    </RowActionMenu>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Phones / tablets: cards -->
        <div class="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 lg:hidden">
          <article
            v-for="s in filteredServices"
            :key="s.id"
            :class="['rounded-xl border border-stone-200 bg-white p-4', s.active ? '' : 'bg-stone-50']"
          >
            <div class="flex items-start gap-3">
              <span class="mt-1.5 size-2.5 shrink-0 rounded-full" :style="{ backgroundColor: s.accent || '#94a3b8' }"></span>
              <div class="min-w-0 flex-1">
                <div class="text-base font-semibold text-stone-900">{{ s.name }}</div>
                <div class="mt-0.5 flex flex-wrap items-center gap-x-3 text-[13px] text-stone-600">
                  <span class="inline-flex items-center gap-1"><Clock :size="14" class="text-stone-400" /> {{ t("{n} min", { n: s.durationMinutes }) }}</span>
                  <span class="font-semibold tabular-nums text-stone-900">{{ formatMoney(s.priceCents, s.currency) }}</span>
                </div>
                <p v-if="s.description" class="mt-1 line-clamp-2 text-[13px] text-stone-500">{{ s.description }}</p>
              </div>
              <AppSwitch :model-value="s.active" :label="t('Shown on booking page')" @update:model-value="toggleActive(s)" />
            </div>
            <div class="mt-3 flex gap-2 border-t border-stone-100 pt-3">
              <button type="button" class="ui-btn ui-btn-secondary flex-1" @click="openEdit(s)">
                <Edit2 :size="16" /> {{ t("Edit") }}
              </button>
              <button type="button" class="ui-btn ui-btn-secondary ui-btn-icon !text-red-700" :aria-label="t('Deactivate Service')" @click="deleteService(s)">
                <Trash2 :size="16" />
              </button>
            </div>
          </article>
        </div>
      </template>
    </div>

    <!-- Create Service Modal -->
    <div
      v-if="showCreateModal"
      class="m-sheet fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs"
    >
      <div class="m-sheet-panel w-full max-w-md rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl space-y-5">
        <div class="flex items-center justify-between border-b border-stone-100 pb-3">
          <h3 class="font-display text-xl font-bold text-stone-900">{{ t("New Service") }}</h3>
          <button type="button" @click="showCreateModal = false" class="m-sheet-close rounded-lg p-1.5 text-stone-400 hover:bg-stone-100">
            <X :size="18" />
          </button>
        </div>

        <form @submit.prevent="handleCreate" class="space-y-4">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">{{ t("Service Name") }}</label>
            <input
              v-model="serviceForm.name"
              type="text"
              required
              :placeholder="t('e.g. Haircut & Beard Trim')"
              class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-xs outline-none focus:border-stone-900 focus:bg-white"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">{{ t("Category") }}</label>
              <AppSelect
                v-model="serviceForm.category"
                class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-xs outline-none focus:border-stone-900 focus:bg-white"
              >
                <option v-for="c in categories" :key="c" :value="c">{{ c === "General" ? t("General") : c }}</option>
                <option v-if="categoriesEnabled" :value="NEW_CATEGORY">{{ t("+ New category…") }}</option>
              </AppSelect>
              <input
                v-if="serviceForm.category === NEW_CATEGORY"
                v-model="customCategory"
                type="text"
                maxlength="60"
                required
                :placeholder="t('e.g. Hair, Nails, Spa')"
                class="mt-2 w-full rounded-xl border border-stone-200 bg-white p-3 text-xs outline-none focus:border-stone-900"
              />
            </div>
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">{{ t("Duration (Mins)") }}</label>
              <input
                v-model="serviceForm.durationMinutes"
                type="number"
                min="5"
                step="5"
                required
                class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-xs outline-none focus:border-stone-900 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">{{ t("Price") }}</label>
            <div class="flex gap-2">
              <input
                v-model="serviceForm.priceEur"
                type="number"
                inputmode="decimal"
                step="0.01"
                min="0"
                required
                class="min-w-0 flex-1 rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-xs outline-none focus:border-stone-900 focus:bg-white"
              />
              <SearchSelect
                v-model="serviceForm.currency"
                :options="currencyOptions"
                class="w-32 shrink-0"
                :placeholder="t('Currency')"
                :search-placeholder="t('Search, e.g. riyal')"
              />
            </div>
            <p class="mt-1 text-[11px] text-stone-500">
              {{ t("Customers see {price}", { price: formatMoney(Math.round((parseFloat(serviceForm.priceEur) || 0) * 100), serviceForm.currency) }) }}
            </p>
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">{{ t("Accent Color") }}</label>
            <div class="flex items-center gap-2">
              <button
                v-for="c in defaultAccents"
                :key="c"
                type="button"
                @click="serviceForm.accent = c"
                class="size-7 rounded-full border-2 transition"
                :class="serviceForm.accent === c ? 'border-stone-900 scale-110' : 'border-transparent'"
                :style="{ backgroundColor: c }"
              ></button>
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">{{ t("Description (Optional)") }}</label>
            <textarea
              v-model="serviceForm.description"
              rows="2"
              :placeholder="t('Treatment details shown on booking page...')"
              class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-xs outline-none focus:border-stone-900 focus:bg-white"
            ></textarea>
          </div>

          <p v-if="formError" class="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-medium">
            {{ formError }}
          </p>

          <div class="m-sheet-actions flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100">
            <button
              type="button"
              @click="showCreateModal = false"
              class="ui-btn ui-btn-secondary rounded-xl border border-stone-200 px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
            >
              {{ t("Cancel") }}
            </button>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="ui-btn ui-btn-primary rounded-xl bg-stone-900 px-5 py-2 text-xs font-bold text-white hover:bg-stone-800 disabled:opacity-50"
            >
              {{ isSubmitting ? t("Creating...") : t("Save Service") }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit Service Modal -->
    <div
      v-if="showEditModal && selectedService"
      class="m-sheet fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs"
    >
      <div class="m-sheet-panel w-full max-w-md rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl space-y-5">
        <div class="flex items-center justify-between border-b border-stone-100 pb-3">
          <h3 class="font-display text-xl font-bold text-stone-900">{{ t("Edit Service") }}</h3>
          <button type="button" @click="showEditModal = false" class="m-sheet-close rounded-lg p-1.5 text-stone-400 hover:bg-stone-100">
            <X :size="18" />
          </button>
        </div>

        <form @submit.prevent="handleEdit" class="space-y-4">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">{{ t("Service Name") }}</label>
            <input
              v-model="serviceForm.name"
              type="text"
              required
              class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-xs outline-none focus:border-stone-900 focus:bg-white"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">{{ t("Category") }}</label>
              <AppSelect
                v-model="serviceForm.category"
                class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-xs outline-none focus:border-stone-900 focus:bg-white"
              >
                <option v-for="c in categories" :key="c" :value="c">{{ c === "General" ? t("General") : c }}</option>
                <option v-if="categoriesEnabled" :value="NEW_CATEGORY">{{ t("+ New category…") }}</option>
              </AppSelect>
              <input
                v-if="serviceForm.category === NEW_CATEGORY"
                v-model="customCategory"
                type="text"
                maxlength="60"
                required
                :placeholder="t('e.g. Hair, Nails, Spa')"
                class="mt-2 w-full rounded-xl border border-stone-200 bg-white p-3 text-xs outline-none focus:border-stone-900"
              />
            </div>
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">{{ t("Duration (Mins)") }}</label>
              <input
                v-model="serviceForm.durationMinutes"
                type="number"
                min="5"
                step="5"
                required
                class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-xs outline-none focus:border-stone-900 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">{{ t("Price") }}</label>
            <div class="flex gap-2">
              <input
                v-model="serviceForm.priceEur"
                type="number"
                inputmode="decimal"
                step="0.01"
                min="0"
                required
                class="min-w-0 flex-1 rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-xs outline-none focus:border-stone-900 focus:bg-white"
              />
              <SearchSelect
                v-model="serviceForm.currency"
                :options="currencyOptions"
                class="w-32 shrink-0"
                :placeholder="t('Currency')"
                :search-placeholder="t('Search, e.g. riyal')"
              />
            </div>
            <p class="mt-1 text-[11px] text-stone-500">
              {{ t("Customers see {price}", { price: formatMoney(Math.round((parseFloat(serviceForm.priceEur) || 0) * 100), serviceForm.currency) }) }}
            </p>
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">{{ t("Accent Color") }}</label>
            <div class="flex items-center gap-2">
              <button
                v-for="c in defaultAccents"
                :key="c"
                type="button"
                @click="serviceForm.accent = c"
                class="size-7 rounded-full border-2 transition"
                :class="serviceForm.accent === c ? 'border-stone-900 scale-110' : 'border-transparent'"
                :style="{ backgroundColor: c }"
              ></button>
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">{{ t("Description") }}</label>
            <textarea
              v-model="serviceForm.description"
              rows="2"
              class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-xs outline-none focus:border-stone-900 focus:bg-white"
            ></textarea>
          </div>

          <p v-if="formError" class="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-medium">
            {{ formError }}
          </p>

          <div class="m-sheet-actions flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100">
            <button
              type="button"
              @click="showEditModal = false"
              class="ui-btn ui-btn-secondary rounded-xl border border-stone-200 px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
            >
              {{ t("Cancel") }}
            </button>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="ui-btn ui-btn-primary rounded-xl bg-stone-900 px-5 py-2 text-xs font-bold text-white hover:bg-stone-800 disabled:opacity-50"
            >
              {{ isSubmitting ? t("Saving...") : t("Save Changes") }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
