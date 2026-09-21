<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import {
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  Clock,
  Euro,
  Tag,
  Check,
  X,
  AlertCircle,
} from "lucide-vue-next";

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
  accent: "#ca7481",
  active: true,
});

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
});

// Group services by category
const groupedServices = computed(() => {
  const groups: Record<string, ServiceItem[]> = {};
  for (const s of services.value) {
    const cat = s.category || "General";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(s);
  }
  return groups;
});

const openCreate = () => {
  serviceForm.name = "";
  serviceForm.description = "";
  serviceForm.category = "Styling";
  serviceForm.durationMinutes = 45;
  serviceForm.priceEur = "25.00";
  serviceForm.accent = "#ca7481";
  serviceForm.active = true;
  formError.value = "";
  showCreateModal.value = true;
};

const handleCreate = async () => {
  if (!serviceForm.name.trim() || !serviceForm.category.trim()) {
    formError.value = "Name and category are required.";
    return;
  }
  const priceNum = parseFloat(serviceForm.priceEur);
  if (isNaN(priceNum) || priceNum < 0) {
    formError.value = "Please enter a valid price.";
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
        category: serviceForm.category.trim(),
        durationMinutes: Number(serviceForm.durationMinutes),
        priceCents: Math.round(priceNum * 100),
        accent: serviceForm.accent,
        active: serviceForm.active,
      },
    });
    showCreateModal.value = false;
    await loadServices();
  } catch (err: any) {
    formError.value = err?.data?.statusMessage ?? "Failed to create service.";
  } finally {
    isSubmitting.value = false;
  }
};

const openEdit = (s: ServiceItem) => {
  selectedService.value = s;
  serviceForm.name = s.name;
  serviceForm.description = s.description ?? "";
  serviceForm.category = s.category;
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
    formError.value = "Please enter a valid price.";
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
        category: serviceForm.category.trim(),
        durationMinutes: Number(serviceForm.durationMinutes),
        priceCents: Math.round(priceNum * 100),
        accent: serviceForm.accent,
        active: serviceForm.active,
      },
    });
    showEditModal.value = false;
    await loadServices();
  } catch (err: any) {
    formError.value = err?.data?.statusMessage ?? "Failed to update service.";
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
    alert(err?.data?.statusMessage ?? "Failed to toggle status.");
  }
};

const deleteService = async (s: ServiceItem) => {
  if (!confirm(`Are you sure you want to deactivate / archive "${s.name}"?`)) return;
  try {
    await $fetch(`/api/services/${s.id}`, {
      method: "DELETE",
    });
    await loadServices();
  } catch (err: any) {
    alert(err?.data?.statusMessage ?? "Failed to delete service.");
  }
};
</script>

<template>
  <div class="space-y-6 pb-16">
    <!-- Header -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="text-xs font-bold uppercase tracking-wider text-rose-600">Menu & Pricing</p>
        <h1 class="font-display text-3xl font-bold tracking-tight text-stone-900">Services Catalog</h1>
      </div>
      <button
        type="button"
        @click="openCreate"
        class="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-stone-800 transition shadow-sm self-start sm:self-auto"
      >
        <Plus :size="16" />
        <span>Add Service</span>
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="space-y-4">
      <div v-for="i in 3" :key="i" class="h-32 rounded-3xl bg-stone-200/60 animate-pulse"></div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="services.length === 0"
      class="py-16 text-center rounded-3xl border border-dashed border-stone-200 bg-white"
    >
      <Sparkles :size="36" class="mx-auto text-stone-400" />
      <h3 class="mt-3 font-display text-lg font-bold text-stone-900">No services created</h3>
      <p class="mt-1 text-xs text-stone-500 max-w-sm mx-auto">
        Configure the treatments, haircuts, and sessions you offer to customers.
      </p>
      <button
        type="button"
        @click="openCreate"
        class="mt-4 inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2 text-xs font-bold text-white"
      >
        <Plus :size="14" />
        <span>Create First Service</span>
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
          <h2 class="font-display text-lg font-bold text-stone-900">{{ category }}</h2>
          <span class="rounded-full bg-stone-200 px-2 py-0.5 text-[10px] font-bold text-stone-700">
            {{ catServices.length }}
          </span>
        </div>

        <!-- Category Grid -->
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                  {{ s.active ? "Active" : "Hidden" }}
                </button>
              </div>

              <p v-if="s.description" class="text-xs text-stone-500 line-clamp-2 leading-relaxed">
                {{ s.description }}
              </p>

              <div class="flex items-center gap-4 text-xs pt-1">
                <span class="flex items-center gap-1 font-semibold text-stone-800">
                  <Clock :size="13" class="text-stone-400" />
                  {{ s.durationMinutes }} mins
                </span>
                <span class="flex items-center gap-1 font-bold text-stone-900 text-sm">
                  {{ (s.priceCents / 100).toFixed(2) }} €
                </span>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex items-center justify-end gap-1.5 pt-3 border-t border-stone-100">
              <button
                type="button"
                @click="openEdit(s)"
                class="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-900"
                title="Edit Service"
              >
                <Edit2 :size="14" />
              </button>
              <button
                type="button"
                @click="deleteService(s)"
                class="rounded-lg p-1.5 text-stone-400 hover:bg-rose-50 hover:text-rose-600"
                title="Deactivate Service"
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
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs"
    >
      <div class="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl space-y-5">
        <div class="flex items-center justify-between border-b border-stone-100 pb-3">
          <h3 class="font-display text-xl font-bold text-stone-900">New Service</h3>
          <button type="button" @click="showCreateModal = false" class="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100">
            <X :size="18" />
          </button>
        </div>

        <form @submit.prevent="handleCreate" class="space-y-4">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">Service Name</label>
            <input
              v-model="serviceForm.name"
              type="text"
              required
              placeholder="e.g. Haircut & Beard Trim"
              class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-xs outline-none focus:border-stone-900 focus:bg-white"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">Category</label>
              <input
                v-model="serviceForm.category"
                type="text"
                required
                placeholder="Hair, Nails, Spa..."
                class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-xs outline-none focus:border-stone-900 focus:bg-white"
              />
            </div>
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">Duration (Mins)</label>
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
            <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">Price (EUR €)</label>
            <input
              v-model="serviceForm.priceEur"
              type="number"
              step="0.50"
              min="0"
              required
              class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-xs outline-none focus:border-stone-900 focus:bg-white"
            />
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">Accent Color</label>
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
            <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">Description (Optional)</label>
            <textarea
              v-model="serviceForm.description"
              rows="2"
              placeholder="Treatment details shown on booking page..."
              class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-xs outline-none focus:border-stone-900 focus:bg-white"
            ></textarea>
          </div>

          <p v-if="formError" class="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-medium">
            {{ formError }}
          </p>

          <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100">
            <button
              type="button"
              @click="showCreateModal = false"
              class="rounded-xl border border-stone-200 px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="rounded-xl bg-stone-900 px-5 py-2 text-xs font-bold text-white hover:bg-stone-800 disabled:opacity-50"
            >
              {{ isSubmitting ? "Creating..." : "Save Service" }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit Service Modal -->
    <div
      v-if="showEditModal && selectedService"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs"
    >
      <div class="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl space-y-5">
        <div class="flex items-center justify-between border-b border-stone-100 pb-3">
          <h3 class="font-display text-xl font-bold text-stone-900">Edit Service</h3>
          <button type="button" @click="showEditModal = false" class="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100">
            <X :size="18" />
          </button>
        </div>

        <form @submit.prevent="handleEdit" class="space-y-4">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">Service Name</label>
            <input
              v-model="serviceForm.name"
              type="text"
              required
              class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-xs outline-none focus:border-stone-900 focus:bg-white"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">Category</label>
              <input
                v-model="serviceForm.category"
                type="text"
                required
                class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-xs outline-none focus:border-stone-900 focus:bg-white"
              />
            </div>
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">Duration (Mins)</label>
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
            <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">Price (EUR €)</label>
            <input
              v-model="serviceForm.priceEur"
              type="number"
              step="0.50"
              min="0"
              required
              class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-xs outline-none focus:border-stone-900 focus:bg-white"
            />
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">Accent Color</label>
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
            <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">Description</label>
            <textarea
              v-model="serviceForm.description"
              rows="2"
              class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-xs outline-none focus:border-stone-900 focus:bg-white"
            ></textarea>
          </div>

          <p v-if="formError" class="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-medium">
            {{ formError }}
          </p>

          <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100">
            <button
              type="button"
              @click="showEditModal = false"
              class="rounded-xl border border-stone-200 px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="rounded-xl bg-stone-900 px-5 py-2 text-xs font-bold text-white hover:bg-stone-800 disabled:opacity-50"
            >
              {{ isSubmitting ? "Saving..." : "Save Changes" }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
