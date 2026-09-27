<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import {
  Building2,
  ExternalLink,
  Copy,
  Check,
  Save,
  AlertCircle,
  ImagePlus,
  Trash2,
  Loader2,
  ShieldCheck,
  KeyRound,
  Smartphone,
  CalendarClock,
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
  nameChangeCount?: number;
  nameCooldownUntil?: string | null;
}

const { user, refreshUser } = useSupabaseAuth();
const refreshBusinessProfile = inject<(() => Promise<void>) | undefined>(
  "refreshBusinessProfile",
  undefined,
);

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
    // logoUrl is intentionally NOT sent here — it is managed exclusively
    // through the upload endpoint below.
    const updated = await $fetch<OrgSettings>("/api/organization", {
      method: "PATCH",
      body: {
        name: form.name.trim(),
        slug: form.slug.trim().toLowerCase(),
        description: form.description.trim() || null,
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
    form.logoUrl = updated.logoUrl ?? "";
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

// --- Business name change limiter (2 free, then 14-day cooldown) ----------
const nameLimit = computed(() => {
  const count = org.value?.nameChangeCount ?? 0;
  const cooldownUntil = org.value?.nameCooldownUntil
    ? new Date(org.value.nameCooldownUntil)
    : null;
  const cooling = !!cooldownUntil && cooldownUntil.getTime() > Date.now();
  return { count, freeLeft: Math.max(0, 2 - count), cooling, nextDate: cooldownUntil };
});

const nameHint = computed(() => {
  if (nameLimit.value.cooling && nameLimit.value.nextDate) {
    return `For security, the business name can only be changed every 14 days. Next change available on ${nameLimit.value.nextDate.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.`;
  }
  if (nameLimit.value.freeLeft > 0) {
    return `${nameLimit.value.freeLeft} free name change${nameLimit.value.freeLeft === 1 ? "" : "s"} left. After that, a change is allowed once every 14 days.`;
  }
  return "Free name changes used — a change is allowed once every 14 days.";
});

// --- Logo upload: client-side center-crop to square + resize, then upload --
const fileInput = ref<HTMLInputElement | null>(null);
const isUploadingLogo = ref(false);
const logoPending = ref<Blob | null>(null);
const logoPreview = ref("");
const logoError = ref("");

const displayLogo = computed(() => logoPreview.value || form.logoUrl);

const processImageFile = (file: File): Promise<{ dataUrl: string; blob: Blob }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          // Center-crop to the largest square, then resize to max 512px.
          const side = Math.min(img.naturalWidth, img.naturalHeight);
          const sx = (img.naturalWidth - side) / 2;
          const sy = (img.naturalHeight - side) / 2;
          const out = Math.min(512, side);
          const canvas = document.createElement("canvas");
          canvas.width = out;
          canvas.height = out;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Your browser does not support image processing."));
            return;
          }
          ctx.drawImage(img, sx, sy, side, side, 0, 0, out, out);
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Could not process the image. Try another file."));
                return;
              }
              resolve({ dataUrl: canvas.toDataURL("image/png"), blob });
            },
            "image/png",
            0.92,
          );
        } catch (e) {
          reject(new Error("Could not process the image. Try another file."));
        }
      };
      img.onerror = () =>
        reject(new Error("That file could not be read as an image."));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsDataURL(file);
  });
};

const onLogoFileChange = async (e: Event) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = ""; // allow re-selecting the same file later
  if (!file) return;

  logoError.value = "";
  if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
    logoError.value = "Please choose a PNG or JPG image.";
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    logoError.value = "Image is too large (max 10 MB before cropping).";
    return;
  }

  isUploadingLogo.value = true;
  try {
    const { dataUrl, blob } = await processImageFile(file);
    logoPreview.value = dataUrl;
    logoPending.value = blob;
  } catch (err: any) {
    logoError.value = err?.message ?? "Could not process that image.";
  } finally {
    isUploadingLogo.value = false;
  }
};

const cancelLogoPreview = () => {
  logoPending.value = null;
  logoPreview.value = "";
  logoError.value = "";
};

const applyLogo = async () => {
  if (!logoPending.value) return;
  isUploadingLogo.value = true;
  logoError.value = "";
  try {
    const fd = new FormData();
    fd.append("file", logoPending.value, "logo.png");
    const updated = await $fetch<OrgSettings>("/api/organization/logo", {
      method: "POST",
      body: fd,
    });
    org.value = updated;
    form.logoUrl = updated.logoUrl ?? "";
    cancelLogoPreview();
    successMessage.value = "Logo updated!";
    setTimeout(() => {
      successMessage.value = "";
    }, 3000);
    await refreshBusinessProfile?.();
  } catch (err: any) {
    logoError.value = err?.data?.statusMessage ?? "Logo upload failed. Please try again.";
  } finally {
    isUploadingLogo.value = false;
  }
};

const removeLogo = async () => {
  isUploadingLogo.value = true;
  logoError.value = "";
  try {
    const updated = await $fetch<OrgSettings>("/api/organization", {
      method: "PATCH",
      body: { logoUrl: null },
    });
    org.value = updated;
    form.logoUrl = "";
    cancelLogoPreview();
    await refreshBusinessProfile?.();
  } catch (err: any) {
    logoError.value = err?.data?.statusMessage ?? "Could not remove the logo.";
  } finally {
    isUploadingLogo.value = false;
  }
};

// --- Account Security: email + mobile change with emailed 6-digit codes ----
const currentEmail = computed(() => user.value?.email ?? "");
const accountPhone = computed(() => {
  const p = user.value?.user_metadata?.phone;
  return typeof p === "string" && p ? p : "";
});

const emailStep = ref<"idle" | "sent">("idle");
const newEmail = ref("");
const emailCode = ref("");
const emailBusy = ref(false);
const emailError = ref("");
const emailNotice = ref("");

const requestEmailChange = async () => {
  emailError.value = "";
  emailNotice.value = "";
  if (!newEmail.value.trim()) {
    emailError.value = "Enter the new email address first.";
    return;
  }
  emailBusy.value = true;
  try {
    await $fetch("/api/account/email-change/request", {
      method: "POST",
      body: { newEmail: newEmail.value.trim() },
    });
    emailStep.value = "sent";
    emailNotice.value = `We sent a 6-digit code to ${currentEmail.value}. It expires in 15 minutes.`;
  } catch (err: any) {
    emailError.value = err?.data?.statusMessage ?? "Could not send the verification code.";
  } finally {
    emailBusy.value = false;
  }
};

const confirmEmailChange = async () => {
  emailError.value = "";
  emailNotice.value = "";
  emailBusy.value = true;
  try {
    const res = await $fetch<{ ok: boolean; email: string; applied: boolean }>(
      "/api/account/email-change/confirm",
      {
        method: "POST",
        body: { newEmail: newEmail.value.trim(), code: emailCode.value.trim() },
      },
    );
    emailStep.value = "idle";
    newEmail.value = "";
    emailCode.value = "";
    if (res.applied) {
      await refreshUser();
      emailNotice.value = "Your login email has been updated.";
    } else {
      emailNotice.value = `Almost done — open the confirmation link we sent to ${res.email} to finalize the change.`;
    }
  } catch (err: any) {
    emailError.value = err?.data?.statusMessage ?? "Invalid or expired code.";
  } finally {
    emailBusy.value = false;
  }
};

const phoneStep = ref<"idle" | "sent">("idle");
const newPhone = ref("");
const phoneCode = ref("");
const phoneBusy = ref(false);
const phoneError = ref("");
const phoneNotice = ref("");

const requestPhoneChange = async () => {
  phoneError.value = "";
  phoneNotice.value = "";
  if (!newPhone.value.trim()) {
    phoneError.value = "Enter the new mobile number first.";
    return;
  }
  phoneBusy.value = true;
  try {
    await $fetch("/api/account/phone-change/request", {
      method: "POST",
      body: { newPhone: newPhone.value.trim() },
    });
    phoneStep.value = "sent";
    phoneNotice.value = `We sent a 6-digit code to ${currentEmail.value}. It expires in 15 minutes.`;
  } catch (err: any) {
    phoneError.value = err?.data?.statusMessage ?? "Could not send the verification code.";
  } finally {
    phoneBusy.value = false;
  }
};

const confirmPhoneChange = async () => {
  phoneError.value = "";
  phoneNotice.value = "";
  phoneBusy.value = true;
  try {
    const res = await $fetch<{ ok: boolean; phone: string }>(
      "/api/account/phone-change/confirm",
      {
        method: "POST",
        body: { newPhone: newPhone.value.trim(), code: phoneCode.value.trim() },
      },
    );
    phoneStep.value = "idle";
    newPhone.value = "";
    phoneCode.value = "";
    await refreshUser();
    phoneNotice.value = `Mobile number updated to ${res.phone}.`;
  } catch (err: any) {
    phoneError.value = err?.data?.statusMessage ?? "Invalid or expired code.";
  } finally {
    phoneBusy.value = false;
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

    <template v-else>
      <!-- Settings Form -->
      <form @submit.prevent="saveSettings" class="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm space-y-6">
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
            <p
              class="mt-1.5 text-[11px] leading-relaxed flex items-start gap-1"
              :class="nameLimit.cooling ? 'text-amber-700' : 'text-stone-500'"
            >
              <CalendarClock :size="12" class="mt-0.5 shrink-0" />
              <span>{{ nameHint }}</span>
            </p>
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
            <p class="mt-1.5 text-[11px] text-stone-500">
              Contact email shown to customers — change your login email under Account Security below.
            </p>
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">Business Phone</label>
            <input
              v-model="form.phone"
              type="tel"
              placeholder="+30 210..."
              class="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-xs outline-none focus:border-stone-900 focus:bg-white"
            />
            <p class="mt-1.5 text-[11px] text-stone-500">
              Your account's mobile number can be changed under Account Security below.
            </p>
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

          <!-- Branding: logo upload with auto crop/resize + preview -->
          <div class="sm:col-span-2 rounded-2xl border border-stone-200 bg-stone-50/50 p-4">
            <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div class="relative shrink-0">
                <img
                  v-if="displayLogo"
                  :src="displayLogo"
                  alt="Logo preview"
                  class="size-20 rounded-2xl object-cover border border-stone-200 bg-white shadow-sm"
                />
                <div
                  v-else
                  class="flex size-20 items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-white text-stone-400"
                >
                  <Building2 :size="28" />
                </div>
                <span
                  v-if="logoPending"
                  class="absolute -top-1.5 -right-1.5 rounded-full bg-rose-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-sm"
                >New</span>
              </div>
              <div class="flex-1 space-y-2 min-w-0">
                <label class="block text-xs font-bold uppercase tracking-wider text-stone-600">Business Logo</label>
                <p class="text-[11px] text-stone-500 leading-relaxed">
                  PNG or JPG. We automatically crop it to a square and resize it — check the preview, then press
                  “Set image”. Shown in the dashboard header and booking page.
                </p>
                <div class="flex flex-wrap items-center gap-2 pt-0.5">
                  <input
                    ref="fileInput"
                    type="file"
                    accept="image/png,image/jpeg"
                    class="hidden"
                    @change="onLogoFileChange"
                  />
                  <button
                    type="button"
                    :disabled="isUploadingLogo"
                    @click="fileInput?.click()"
                    class="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 transition disabled:opacity-50"
                  >
                    <Loader2 v-if="isUploadingLogo" :size="14" class="animate-spin" />
                    <ImagePlus v-else :size="14" />
                    <span>{{ form.logoUrl ? "Change logo" : "Upload logo" }}</span>
                  </button>
                  <template v-if="logoPending">
                    <button
                      type="button"
                      :disabled="isUploadingLogo"
                      @click="applyLogo"
                      class="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-rose-700 transition disabled:opacity-50"
                    >
                      <Check :size="14" />
                      <span>Set image</span>
                    </button>
                    <button
                      type="button"
                      :disabled="isUploadingLogo"
                      @click="cancelLogoPreview"
                      class="text-xs font-bold text-stone-500 hover:text-stone-900 transition"
                    >
                      Cancel
                    </button>
                  </template>
                  <button
                    v-else-if="form.logoUrl"
                    type="button"
                    :disabled="isUploadingLogo"
                    @click="removeLogo"
                    class="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition disabled:opacity-50"
                  >
                    <Trash2 :size="14" />
                    <span>Remove</span>
                  </button>
                </div>
                <p v-if="logoError" class="text-[11px] font-semibold text-rose-600 flex items-center gap-1">
                  <AlertCircle :size="12" />
                  <span>{{ logoError }}</span>
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

      <!-- Account Security -->
      <div class="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm space-y-6">
        <div class="border-b border-stone-100 pb-4">
          <h2 class="font-display text-lg font-bold text-stone-900 flex items-center gap-2">
            <ShieldCheck :size="18" class="text-rose-600" />
            Account Security
          </h2>
          <p class="text-xs text-stone-500 mt-1">
            Your login email and mobile number. Every change must be confirmed with a 6-digit code
            sent to your current email address.
          </p>
        </div>

        <div class="grid gap-5 lg:grid-cols-2">
          <!-- Login email -->
          <div class="rounded-2xl border border-stone-200 bg-stone-50/50 p-4 space-y-3">
            <div class="flex items-center gap-2">
              <KeyRound :size="15" class="text-stone-400" />
              <span class="text-xs font-bold uppercase tracking-wider text-stone-700">Login Email</span>
            </div>
            <p class="text-xs text-stone-600 break-all">
              Current: <span class="font-semibold text-stone-900">{{ currentEmail || "—" }}</span>
            </p>

            <template v-if="emailStep === 'idle'">
              <div class="flex flex-col sm:flex-row gap-2">
                <input
                  v-model="newEmail"
                  type="email"
                  placeholder="New email address"
                  class="flex-1 rounded-xl border border-stone-200 bg-white p-2.5 text-xs outline-none focus:border-stone-900"
                />
                <button
                  type="button"
                  :disabled="emailBusy || !newEmail.trim()"
                  @click="requestEmailChange"
                  class="inline-flex items-center justify-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-stone-800 disabled:opacity-50 transition"
                >
                  <Loader2 v-if="emailBusy" :size="13" class="animate-spin" />
                  <span>Send code</span>
                </button>
              </div>
            </template>
            <template v-else>
              <p class="text-[11px] text-stone-500">
                Code sent to <span class="font-semibold">{{ currentEmail }}</span>. Enter it below to approve the change to
                <span class="font-semibold">{{ newEmail }}</span>.
              </p>
              <input
                v-model="emailCode"
                inputmode="numeric"
                maxlength="6"
                placeholder="••••••"
                class="w-full rounded-xl border border-stone-200 bg-white p-2.5 text-center text-lg font-bold tracking-[0.4em] outline-none focus:border-stone-900"
              />
              <div class="flex gap-2">
                <button
                  type="button"
                  :disabled="emailBusy || emailCode.trim().length !== 6"
                  @click="confirmEmailChange"
                  class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50 transition"
                >
                  <Loader2 v-if="emailBusy" :size="13" class="animate-spin" />
                  <span>Confirm change</span>
                </button>
                <button
                  type="button"
                  :disabled="emailBusy"
                  @click="emailStep = 'idle'; emailError = ''; emailNotice = ''"
                  class="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-xs font-bold text-stone-600 hover:bg-stone-50 transition"
                >
                  Cancel
                </button>
              </div>
            </template>

            <p v-if="emailError" class="text-[11px] font-semibold text-rose-600 flex items-start gap-1">
              <AlertCircle :size="12" class="mt-0.5 shrink-0" />
              <span>{{ emailError }}</span>
            </p>
            <p v-if="emailNotice" class="text-[11px] font-medium text-emerald-700 flex items-start gap-1">
              <Check :size="12" class="mt-0.5 shrink-0" />
              <span>{{ emailNotice }}</span>
            </p>
          </div>

          <!-- Mobile number -->
          <div class="rounded-2xl border border-stone-200 bg-stone-50/50 p-4 space-y-3">
            <div class="flex items-center gap-2">
              <Smartphone :size="15" class="text-stone-400" />
              <span class="text-xs font-bold uppercase tracking-wider text-stone-700">Account Mobile Number</span>
            </div>
            <p class="text-xs text-stone-600 break-all">
              Current: <span class="font-semibold text-stone-900">{{ accountPhone || "Not set" }}</span>
            </p>

            <template v-if="phoneStep === 'idle'">
              <div class="flex flex-col sm:flex-row gap-2">
                <input
                  v-model="newPhone"
                  type="tel"
                  placeholder="+30 69..."
                  class="flex-1 rounded-xl border border-stone-200 bg-white p-2.5 text-xs outline-none focus:border-stone-900"
                />
                <button
                  type="button"
                  :disabled="phoneBusy || !newPhone.trim()"
                  @click="requestPhoneChange"
                  class="inline-flex items-center justify-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-stone-800 disabled:opacity-50 transition"
                >
                  <Loader2 v-if="phoneBusy" :size="13" class="animate-spin" />
                  <span>Send code</span>
                </button>
              </div>
            </template>
            <template v-else>
              <p class="text-[11px] text-stone-500">
                Code sent to <span class="font-semibold">{{ currentEmail }}</span>. Enter it below to approve the change to
                <span class="font-semibold">{{ newPhone }}</span>.
              </p>
              <input
                v-model="phoneCode"
                inputmode="numeric"
                maxlength="6"
                placeholder="••••••"
                class="w-full rounded-xl border border-stone-200 bg-white p-2.5 text-center text-lg font-bold tracking-[0.4em] outline-none focus:border-stone-900"
              />
              <div class="flex gap-2">
                <button
                  type="button"
                  :disabled="phoneBusy || phoneCode.trim().length !== 6"
                  @click="confirmPhoneChange"
                  class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50 transition"
                >
                  <Loader2 v-if="phoneBusy" :size="13" class="animate-spin" />
                  <span>Confirm change</span>
                </button>
                <button
                  type="button"
                  :disabled="phoneBusy"
                  @click="phoneStep = 'idle'; phoneError = ''; phoneNotice = ''"
                  class="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-xs font-bold text-stone-600 hover:bg-stone-50 transition"
                >
                  Cancel
                </button>
              </div>
            </template>

            <p v-if="phoneError" class="text-[11px] font-semibold text-rose-600 flex items-start gap-1">
              <AlertCircle :size="12" class="mt-0.5 shrink-0" />
              <span>{{ phoneError }}</span>
            </p>
            <p v-if="phoneNotice" class="text-[11px] font-medium text-emerald-700 flex items-start gap-1">
              <Check :size="12" class="mt-0.5 shrink-0" />
              <span>{{ phoneNotice }}</span>
            </p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
