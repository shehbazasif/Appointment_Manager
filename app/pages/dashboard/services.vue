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
</script>

<template>
  <div class="space-y-6 pb-16">
    <!-- Header -->
    <div class="page-head flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="min-w-0">
        <p class="text-xs font-bold uppercase tracking-wider text-rose-600">{{ t("Menu & Pricing") }}</p>
        <h1 class="font-display text-3xl font-bold tracking-tight text-stone-900">{{ t("Services Catalog") }}</h1>
      </div>
      <button
        type="button"
        @click="openCreate"
        class="max-md:w-full max-md:justify-center max-md:min-h-11 inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-stone-800 transition shadow-sm self-start sm:self-auto"
      >
        <Plus :size="16" />
        <span>{{ t("Add Service") }}</span>
      </button>
    </div>

    <!-- Category manager -->
    <div class="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm space-y-3">
      <div class="flex items-center gap-2">
        <Tag :size="16" class="text-rose-600" />
        <h2 class="text-sm font-bold text-stone-900">{{ t("Categories") }}</h2>
      </div>
      <p v-if="!categoriesEnabled" class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
        {{ t("Categories need a small database update first (scripts/service-categories.sql). Until then all services stay in \"General\".") }}
      </p>
      <template v-else>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="c in categories"
            :key="c"
            class="inline-flex min-h-9 items-center gap-1 rounded-full border border-stone-200 bg-stone-50 ps-3 pe-1 text-xs font-semibold text-stone-800"
          >
            {{ c === "General" ? t("General") : c }}
            <button
              v-if="c !== 'General'"
              type="button"
              :disabled="categoryBusy"
              @click="removeCategory(c)"
              class="grid size-8 place-items-center rounded-full text-stone-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
              :aria-label="`Remove category ${c}`"
              :title="`Remove ${c}`"
            >
              <X :size="14" />
            </button>
            <span v-else class="pe-2"></span>
          </span>
        </div>
        <form class="flex gap-2" @submit.prevent="addCategory">
          <input
            v-model="newCategory"
            type="text"
            maxlength="60"
            :placeholder="t('New category, e.g. Nails')"
            class="min-w-0 flex-1 rounded-xl border border-stone-200 bg-stone-50/60 px-3 py-2 text-xs outline-none focus:border-stone-900 focus:bg-white sm:max-w-xs"
          />
          <button
            type="submit"
            :disabled="categoryBusy || !newCategory.trim()"
            class="tap inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            <Plus :size="14" />
            <span>{{ t("Add") }}</span>
          </button>
        </form>
        <p v-if="categoryError" class="text-xs font-medium text-rose-700">{{ categoryError }}</p>
      </template>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="space-y-4">
      <div v-for="i in 3" :key="i" class="h-32 rounded-3xl bg-stone-200/60 animate-pulse"></div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="!hasAnyGroup"
      class="py-16 text-center rounded-3xl border border-dashed border-stone-200 bg-white"
    >
      <Sparkles :size="36" class="mx-auto text-stone-400" />
      <h3 class="mt-3 font-display text-lg font-bold text-stone-900">{{ t("No services created") }}</h3>
      <p class="mt-1 text-xs text-stone-500 max-w-sm mx-auto">
        {{ t("Configure the treatments, haircuts, and sessions you offer to customers.") }}
      </p>
      <button
        type="button"
        @click="openCreate"
        class="mt-4 inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2 text-xs font-bold text-white"
      >
        <Plus :size="14" />
        <span>{{ t("Create First Service") }}</span>
      </button>
    </div>

    <!-- Grouped Categories -->
    <div v-else class="space-y-8">
      <div
        v-for="(catServices, category) in groupedServices"
        :key="category"
        class="space-y-3"
      >
        <!-- Category Title -->
        <div class="flex items-center gap-2">
          <Tag :size="16" class="text-rose-600" />
          <h2 class="font-display text-lg font-bold text-stone-900">{{ category === "General" ? t("General") : category }}</h2>
          <span class="rounded-full bg-stone-200 px-2 py-0.5 text-[10px] font-bold text-stone-700">
            {{ catServices.length }}
          </span>
        </div>

        <p
          v-if="catServices.length === 0"
          class="rounded-2xl border border-dashed border-stone-200 bg-white p-4 text-xs text-stone-500"
        >
          {{ t('No services in this category yet. Add a service and choose "{category}".', { category: t(category) }) }}
        </p>

        <!-- Category Grid -->
        <div v-else class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="s in catServices"
            :key="s.id"
            :class="[
              s.active ? 'border-stone-200 bg-white' : 'border-stone-200/60 bg-stone-100/60 opacity-75',
              'rounded-3xl border p-5 shadow-2xs space-y-3 transition flex flex-col justify-between',
            ]"
          >
            <div class="space-y-2">
              <div class="flex items-start justify-between">
                <div class="flex items-center gap-2">
                  <span
                    class="size-3 rounded-full shrink-0 shadow-2xs"
                    :style="{ backgroundColor: s.accent || '#ca7481' }"
                  ></span>
                  <h3 class="font-bold text-stone-900 text-sm leading-snug">{{ s.name }}</h3>
                </div>
                <button
                  type="button"
                  @click="toggleActive(s)"
                  :class="[
                    s.active
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-stone-200 text-stone-600 border-stone-300',
                    'rounded-lg border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                  ]"
                >
                  {{ s.active ? t("Active") : t("Hidden") }}
                </button>
              </div>

              <p v-if="s.description" class="text-xs text-stone-500 line-clamp-2 leading-relaxed">
                {{ s.description }}
              </p>

              <div class="flex items-center gap-4 text-xs pt-1">
                <span class="flex items-center gap-1 font-semibold text-stone-800">
                  <Clock :size="13" class="text-stone-400" />
                  {{ t("{n} mins", { n: s.durationMinutes }) }}
                </span>
                <span class="flex items-center gap-1 font-bold text-stone-900 text-sm">
                  {{ formatMoney(s.priceCents, s.currency) }}
                </span>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex items-center justify-end gap-1.5 pt-3 border-t border-stone-100">
              <button
                type="button"
                @click="openEdit(s)"
                class="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-900"
                :title="t('Edit Service')"
              >
                <Edit2 :size="14" />
              </button>
              <button
                type="button"
                @click="deleteService(s)"
                class="rounded-lg p-1.5 text-stone-400 hover:bg-rose-50 hover:text-rose-600"
                :title="t('Deactivate Service')"
              >
                <Trash2 :size="14" />
              </button>
            </div>
          </div>
        </div>
      </div>
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
              class="rounded-xl border border-stone-200 px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
            >
              {{ t("Cancel") }}
            </button>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="rounded-xl bg-stone-900 px-5 py-2 text-xs font-bold text-white hover:bg-stone-800 disabled:opacity-50"
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
              class="rounded-xl border border-stone-200 px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
            >
              {{ t("Cancel") }}
            </button>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="rounded-xl bg-stone-900 px-5 py-2 text-xs font-bold text-white hover:bg-stone-800 disabled:opacity-50"
            >
              {{ isSubmitting ? t("Saving...") : t("Save Changes") }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
