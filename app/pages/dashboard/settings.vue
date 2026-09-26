<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import {
  Settings,
  Building2,
  Globe,
  Mail,
  Phone,
  MapPin,
  Clock,
  Euro,
  ExternalLink,
  Copy,
  Check,
  Save,
  AlertCircle,
  Sparkles,
} from "lucide-vue-next";

definePageMeta({
  layout: "dashboard",
});

interface OrgSettings {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logoUrl?: string | null;
  email: string;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  country: string;
  timezone: string;
  currency: string;
  bookingActive: boolean;
}

const org = ref<OrgSettings | null>(null);
const isLoading = ref(true);
const isSaving = ref(false);
const copied = ref(false);
const successMessage = ref("");
const errorMessage = ref("");

const form = reactive({
  name: "",
  slug: "",
  description: "",
  logoUrl: "",
  email: "",
  phone: "",
  address: "",
  city: "Athens",
  country: "Greece",
  timezone: "Europe/Athens",
  currency: "EUR",
  bookingActive: true,
});

const loadSettings = async () => {
  isLoading.value = true;
  try {
    const data = await $fetch<OrgSettings>("/api/organization");
    org.value = data;
    form.name = data.name;
    form.slug = data.slug;
    form.description = data.description ?? "";
    form.logoUrl = data.logoUrl ?? "";
    form.email = data.email;
    form.phone = data.phone ?? "";
    form.address = data.address ?? "";
    form.city = data.city ?? "Athens";
    form.country = data.country ?? "Greece";
    form.timezone = data.timezone ?? "Europe/Athens";
    form.currency = data.currency ?? "EUR";
    form.bookingActive = data.bookingActive;
  } catch (err: any) {
    errorMessage.value = err?.data?.statusMessage ?? "Failed to load settings.";
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  loadSettings();
});

const bookingUrl = computed(() => {
  if (!form.slug) return "";
  if (import.meta.client) {
    return `${window.location.origin}/book/${form.slug}`;
  }
  return `/book/${form.slug}`;
});

const copyLink = async () => {
  if (!bookingUrl.value) return;
  try {
    await navigator.clipboard.writeText(bookingUrl.value);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (e) {
    console.error("Failed to copy", e);
  }
};

const saveSettings = async () => {
  if (!form.name.trim() || !form.email.trim() || !form.slug.trim()) {
    errorMessage.value = "Business name, slug, and email are required.";
    return;
  }

  isSaving.value = true;
  errorMessage.value = "";
  successMessage.value = "";

  try {
    const updated = await $fetch<OrgSettings>("/api/organization", {
      method: "PATCH",
      body: {
        name: form.name.trim(),
        slug: form.slug.trim().toLowerCase(),
        description: form.description.trim() || null,
        logoUrl: form.logoUrl.trim() || null,
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        country: form.country.trim(),
        timezone: form.timezone.trim(),
        currency: form.currency.trim(),
        bookingActive: form.bookingActive,
      },
    });

    org.value = updated;
    successMessage.value = "Business settings saved successfully!";
    setTimeout(() => {
      successMessage.value = "";
    }, 3000);
  } catch (err: any) {
    errorMessage.value = err?.data?.statusMessage ?? "Failed to update business settings.";
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <div class="space-y-7 pb-16 max-w-4xl">
    <!-- Header -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="text-xs font-bold uppercase tracking-wider text-rose-600">Preferences & Profile</p>
        <h1 class="font-display text-3xl font-bold tracking-tight text-stone-900">Business Settings</h1>
      </div>
      <button
        type="button"
        :disabled="isSaving"
        @click="saveSettings"
        class="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-stone-800 disabled:opacity-50 transition shadow-sm self-start sm:self-auto"
      >
        <Save :size="15" />
        <span>{{ isSaving ? "Saving..." : "Save Changes" }}</span>
      </button>
    </div>

    <!-- Public Booking Link Display Card -->
    <div class="rounded-3xl border border-rose-200/80 bg-gradient-to-tr from-rose-50/70 to-white p-6 shadow-sm space-y-4">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span class="text-[10px] font-bold uppercase tracking-wider text-rose-600">Customer Booking Hub</span>
          <h2 class="font-display text-xl font-bold text-stone-900 mt-0.5">Your Public Booking Page</h2>
          <p class="text-xs text-stone-600 mt-1">
            Share this URL on Instagram, Google Business, or WhatsApp to let clients book appointments 24/7.
          </p>
        </div>

        <!-- Online Booking Switch -->
        <div class="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-2.5 shadow-2xs">
          <span class="text-xs font-bold text-stone-800">Online Booking</span>
          <input
            type="checkbox"
            id="bookingToggle"
            v-model="form.bookingActive"
            class="size-4.5 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
          />
        </div>
      </div>

      <!-- URL Bar with Copy & Preview -->
      <div class="flex flex-col sm:flex-row items-center gap-2 rounded-2xl border border-stone-200 bg-white p-2 shadow-2xs">
        <div class="flex-1 px-3 py-1.5 font-mono text-xs text-stone-700 truncate w-full">
          {{ bookingUrl }}
        </div>
        <div class="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            type="button"
            @click="copyLink"
            class="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-xs font-bold text-stone-700 hover:bg-stone-100 transition"
          >
            <Check v-if="copied" :size="14" class="text-emerald-600" />
            <Copy v-else :size="14" class="text-stone-400" />
            <span>{{ copied ? "Copied!" : "Copy Link" }}</span>
          </button>
          <NuxtLink
            :to="`/book/${form.slug}`"
            target="_blank"
            class="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-bold text-white hover:bg-stone-800 transition"
          >
            <ExternalLink :size="14" />
            <span>Open Page</span>
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="space-y-4">
      <div v-for="i in 3" :key="i" class="h-32 rounded-3xl bg-stone-200/60 animate-pulse"></div>
    </div>

    <!-- Settings Form -->
    <form v-else @submit.prevent="saveSettings" class="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm space-y-6">
      <div class="border-b border-stone-100 pb-4">
        <h2 class="font-display text-lg font-bold text-stone-900">General Profile</h2>
        <p class="text-xs text-stone-500">Business identification and contact information.</p>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">Business Name</label>
          <input
            v-model="form.name"
            type="text"
            required
            class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-xs outline-none focus:border-stone-900 focus:bg-white"
          />
        </div>

        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">URL Slug</label>
          <input
            v-model="form.slug"
            type="text"
            required
            placeholder="maria-beauty-studio"
            class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-xs outline-none focus:border-stone-900 focus:bg-white"
          />
        </div>

        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">Business Email</label>
          <input
            v-model="form.email"
            type="email"
            required
            class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-xs outline-none focus:border-stone-900 focus:bg-white"
          />
        </div>

        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">Phone Number</label>
          <input
            v-model="form.phone"
            type="tel"
            placeholder="+30 210..."
            class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-xs outline-none focus:border-stone-900 focus:bg-white"
          />
        </div>

        <div class="sm:col-span-2">
          <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">Description</label>
          <textarea
            v-model="form.description"
            rows="3"
            placeholder="Tell customers what sets your studio apart..."
            class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-xs outline-none focus:border-stone-900 focus:bg-white"
          ></textarea>
        </div>

        <!-- Branding: logo preview + URL -->
        <div class="sm:col-span-2 rounded-2xl border border-stone-200 bg-stone-50/50 p-4">
          <div class="flex items-center gap-4">
            <img
              v-if="form.logoUrl"
              :src="form.logoUrl"
              alt="Logo preview"
              class="size-16 rounded-2xl object-cover border border-stone-200 bg-white shadow-sm"
            />
            <div
              v-else
              class="flex size-16 items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-white text-stone-400"
            >
              <Building2 :size="24" />
            </div>
            <div class="flex-1">
              <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">Logo URL</label>
              <input
                v-model="form.logoUrl"
                type="url"
                placeholder="https://example.com/logo.png"
                class="w-full rounded-xl border border-stone-200 bg-white p-3 text-xs outline-none focus:border-stone-900"
              />
              <p class="mt-1.5 text-[11px] text-stone-500">
                Paste a link to your logo image (from your website, Google Drive public link, etc.). Shown in the dashboard header.
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Location & Region -->
      <div class="border-t border-stone-100 pt-6">
        <h2 class="font-display text-lg font-bold text-stone-900">Location & Localization</h2>
        <p class="text-xs text-stone-500">Physical address, currency, and timezone settings.</p>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div class="sm:col-span-2">
          <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">Street Address</label>
          <input
            v-model="form.address"
            type="text"
            placeholder="Ermou 45"
            class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-xs outline-none focus:border-stone-900 focus:bg-white"
          />
        </div>

        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">City</label>
          <input
            v-model="form.city"
            type="text"
            placeholder="Athens"
            class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-xs outline-none focus:border-stone-900 focus:bg-white"
          />
        </div>

        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">Country</label>
          <input
            v-model="form.country"
            type="text"
            placeholder="Greece"
            class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-xs outline-none focus:border-stone-900 focus:bg-white"
          />
        </div>

        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">Timezone</label>
          <input
            v-model="form.timezone"
            type="text"
            placeholder="Europe/Athens"
            class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-xs outline-none focus:border-stone-900 focus:bg-white"
          />
        </div>

        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">Currency</label>
          <input
            v-model="form.currency"
            type="text"
            placeholder="EUR"
            class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-xs outline-none focus:border-stone-900 focus:bg-white"
          />
        </div>
      </div>

      <!-- Feedback Alerts -->
      <p
        v-if="errorMessage"
        class="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-700 flex items-center gap-2"
      >
        <AlertCircle :size="16" />
        <span>{{ errorMessage }}</span>
      </p>

      <p
        v-if="successMessage"
        class="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-700 flex items-center gap-2"
      >
        <Check :size="16" />
        <span>{{ successMessage }}</span>
      </p>

      <div class="flex justify-end pt-4 border-t border-stone-100">
        <button
          type="submit"
          :disabled="isSaving"
          class="rounded-xl bg-stone-900 px-6 py-2.5 text-xs font-bold text-white hover:bg-stone-800 disabled:opacity-50 transition"
        >
          {{ isSaving ? "Saving..." : "Save Settings" }}
        </button>
      </div>
    </form>
  </div>
</template>
