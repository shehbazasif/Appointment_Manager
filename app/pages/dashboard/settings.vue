<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import type { BusinessType } from "~/utils/businessTypes";
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
  Palette,
  RotateCcw,
  Globe,
  MapPin,
  ChevronRight,
  ChevronLeft,
  LayoutTemplate,
  UsersRound,
} from "lucide-vue-next";
const { t, intl } = useT();

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
  onLocationEnabled?: boolean;
  hidePricesInList?: boolean;
  showTokenToCustomer?: boolean;
  tokensEnabled?: boolean;
  businessType?: string;
  slotStepMinutes?: number;
  allowedFeatures?: Record<string, boolean>;
  language?: string;
  themeColor?: string | null;
  nameChangeCount?: number;
  nameCooldownUntil?: string | null;
  isBranch?: boolean;
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
  onLocationEnabled: false,
  hidePricesInList: false,
  showTokenToCustomer: false,
  tokensEnabled: true,
  businessType: "general" as BusinessType,
  slotStepMinutes: 30,
  language: "en",
  themeColor: null as string | null,
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
    form.onLocationEnabled = data.onLocationEnabled ?? false;
    form.hidePricesInList = data.hidePricesInList ?? false;
    form.showTokenToCustomer = data.showTokenToCustomer ?? false;
    form.tokensEnabled = data.tokensEnabled ?? true;
    form.businessType = (data.businessType ?? "general") as BusinessType;
    form.slotStepMinutes = data.slotStepMinutes ?? 30;
    form.language = data.language ?? "en";
    form.themeColor = data.themeColor ?? null;
  } catch (err: any) {
    errorMessage.value = err?.data?.statusMessage ?? t("Failed to load settings.");
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
    errorMessage.value = t("Business name, slug, and email are required.");
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
        onLocationEnabled: form.onLocationEnabled,
        hidePricesInList: form.hidePricesInList,
        showTokenToCustomer: form.showTokenToCustomer,
        tokensEnabled: form.tokensEnabled,
        businessType: form.businessType,
        slotStepMinutes: form.slotStepMinutes,
        language: form.language,
        themeColor: form.themeColor,
      },
    });

    org.value = updated;
    // switch the dashboard to the new business language right away
    await applyLocale(form.language);
    await refreshBusinessProfile?.();
    form.logoUrl = updated.logoUrl ?? "";
    successMessage.value = t("Business settings saved successfully!");
    setTimeout(() => {
      successMessage.value = "";
    }, 3000);
  } catch (err: any) {
    errorMessage.value = err?.data?.statusMessage ?? t("Failed to update business settings.");
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
    return t("For security, the business name can only be changed every 14 days. Next change available on {date}.", { date: nameLimit.value.nextDate.toLocaleDateString(intl.value, { day: "numeric", month: "long", year: "numeric" }) });
  }
  if (nameLimit.value.freeLeft > 0) {
    return nameLimit.value.freeLeft === 1
      ? t("1 free name change left. After that, a change is allowed once every 14 days.")
      : t("{n} free name changes left. After that, a change is allowed once every 14 days.", { n: nameLimit.value.freeLeft });
  }
  return t("Free name changes used — a change is allowed once every 14 days.");
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
            reject(new Error(t("Your browser does not support image processing.")));
            return;
          }
          ctx.drawImage(img, sx, sy, side, side, 0, 0, out, out);
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error(t("Could not process the image. Try another file.")));
                return;
              }
              resolve({ dataUrl: canvas.toDataURL("image/png"), blob });
            },
            "image/png",
            0.92,
          );
        } catch (e) {
          reject(new Error(t("Could not process the image. Try another file.")));
        }
      };
      img.onerror = () =>
        reject(new Error(t("That file could not be read as an image.")));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error(t("Could not read the file.")));
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
    logoError.value = t(t("Please choose a PNG or JPG image."));
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    logoError.value = t("Image is too large (max 10 MB before cropping).");
    return;
  }

  isUploadingLogo.value = true;
  try {
    const { dataUrl, blob } = await processImageFile(file);
    logoPreview.value = dataUrl;
    logoPending.value = blob;
  } catch (err: any) {
    logoError.value = err?.message ?? t("Could not process that image.");
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
    successMessage.value = t("Logo updated!");
    setTimeout(() => {
      successMessage.value = "";
    }, 3000);
    await refreshBusinessProfile?.();
  } catch (err: any) {
    logoError.value = err?.data?.statusMessage ?? t("Logo upload failed. Please try again.");
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
    logoError.value = err?.data?.statusMessage ?? t("Could not remove the logo.");
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
    emailError.value = t("Enter the new email address first.");
    return;
  }
  emailBusy.value = true;
  try {
    await $fetch("/api/account/email-change/request", {
      method: "POST",
      body: { newEmail: newEmail.value.trim() },
    });
    emailStep.value = "sent";
    emailNotice.value = t("We sent a 6-digit code to {email}. It expires in 15 minutes.", { email: currentEmail.value });
  } catch (err: any) {
    emailError.value = err?.data?.statusMessage ?? t("Could not send the verification code.");
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
      emailNotice.value = t("Your login email has been updated.");
    } else {
      emailNotice.value = t("Almost done — open the confirmation link we sent to {email} to finalize the change.", { email: res.email });
    }
  } catch (err: any) {
    emailError.value = err?.data?.statusMessage ?? t("Invalid or expired code.");
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
    phoneError.value = t("Enter the new mobile number first.");
    return;
  }
  phoneBusy.value = true;
  try {
    await $fetch("/api/account/phone-change/request", {
      method: "POST",
      body: { newPhone: newPhone.value.trim() },
    });
    phoneStep.value = "sent";
    phoneNotice.value = t("We sent a 6-digit code to {email}. It expires in 15 minutes.", { email: currentEmail.value });
  } catch (err: any) {
    phoneError.value = err?.data?.statusMessage ?? t("Could not send the verification code.");
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
    phoneNotice.value = t("Mobile number updated to {phone}.", { phone: res.phone });
  } catch (err: any) {
    phoneError.value = err?.data?.statusMessage ?? t("Invalid or expired code.");
  } finally {
    phoneBusy.value = false;
  }
};
// --- Sections (desktop: side panel; phones: list -> one screen per section) --
const SECTIONS = [
  { id: "profile", title: "Business profile", sub: "Name, logo, contact details", icon: Building2 },
  { id: "type", title: "Business type", sub: "A ready setup for your kind of business", icon: LayoutTemplate },
  { id: "booking", title: "Booking page", sub: "Online booking, tokens, prices", icon: Globe },
  { id: "region", title: "Location & language", sub: "Address, time zone, currency, language", icon: MapPin },
  { id: "theme", title: "Theme", sub: "Your brand colour", icon: Palette },
  { id: "team", title: "Team", sub: "Who can sign in, invite by email", icon: UsersRound },
  { id: "security", title: "Account security", sub: "Login email and mobile number", icon: ShieldCheck },
] as const;
// Features the platform admin switched off are not shown at all
const allowed = (k: string) => org.value?.allowedFeatures?.[k] !== false;
// A branch follows its head office: no business type, booking page or team here
const businessProfile = inject<Ref<any> | null>("businessProfile", null);
const isBranch = computed(() => !!org.value?.isBranch);
/** head office working inside a branch (may rename it) */
const headInBranch = computed(() => isBranch.value && !!businessProfile?.value?.viewingBranch);
const BRANCH_HIDDEN = ["type", "booking", "team"];
const visibleSections = computed(() =>
  SECTIONS.filter((s) => (s.id !== "theme" || allowed("theme")) && !(isBranch.value && BRANCH_HIDDEN.includes(s.id))),
);
const typeNote = ref("");
const applyType = () => {
  const p = businessTypeOf(form.businessType).settings;
  if (allowed("tokens")) {
    form.tokensEnabled = p.tokensEnabled;
    form.showTokenToCustomer = p.showTokenToCustomer;
  }
  if (allowed("onLocation")) form.onLocationEnabled = p.onLocationEnabled;
  form.slotStepMinutes = p.slotStepMinutes;
  typeNote.value = t("Recommended settings filled in. Press Save Changes to keep them.");
};
const route = useRoute();
const router = useRouter();
const section = computed(() => {
  const q = String(route.query.section ?? "");
  return visibleSections.value.some((s) => s.id === q) ? q : "";
});
const shown = computed(() => section.value || "profile");
const current = computed(() => SECTIONS.find((s) => s.id === shown.value) ?? SECTIONS[0]);
const openSection = (id: string) => {
  const query = { ...route.query };
  if (id) query.section = id;
  else delete query.section;
  // phones: going into a section is a new screen (Back returns to the list)
  if (id && !section.value) router.push({ query });
  else router.replace({ query });
};
const backToList = () => {
  if (import.meta.client && window.history.state?.back) router.back();
  else openSection("");
};
</script>

<template>
  <div class="space-y-5 pb-16">
    <!-- Header -->
    <div class="ds-page-head">
      <div class="min-w-0">
        <h1 class="ds-page-title">{{ t("Settings") }}</h1>
        <p class="ds-page-sub">{{ t("Your business profile, booking page, language, colours and login.") }}</p>
      </div>
    </div>

    <div class="grid gap-5 lg:grid-cols-[232px_minmax(0,1fr)] lg:items-start">
      <!-- Section menu: a side panel on desktop, its own screen on phones -->
      <nav
        :class="[section ? 'hidden lg:block' : 'block', 'lg:sticky lg:top-0']"
        :aria-label="t('Settings')"
      >
        <!-- desktop -->
        <div class="ds-card hidden p-2 lg:grid lg:gap-0.5">
          <button
            v-for="s in visibleSections"
            :key="s.id"
            type="button"
            :class="['ds-nav-item w-full text-start', shown === s.id ? 'is-active' : '']"
            :aria-current="shown === s.id ? 'page' : undefined"
            @click="openSection(s.id)"
          >
            <component :is="s.icon" :size="18" />
            <span class="truncate">{{ t(s.title) }}</span>
          </button>
        </div>
        <!-- phones -->
        <div class="ds-card divide-y divide-stone-200 overflow-hidden lg:hidden">
          <button
            v-for="s in visibleSections"
            :key="s.id"
            type="button"
            class="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-start active:bg-stone-50"
            @click="openSection(s.id)"
          >
            <span class="grid size-10 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-700">
              <component :is="s.icon" :size="20" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block text-[15px] font-semibold text-stone-900">{{ t(s.title) }}</span>
              <span class="block truncate text-[13px] text-stone-500">{{ t(s.sub) }}</span>
            </span>
            <ChevronRight :size="18" class="shrink-0 text-stone-400 rtl:rotate-180" />
          </button>
        </div>
      </nav>

      <!-- Section content -->
      <div :class="[section ? 'block' : 'hidden lg:block', 'min-w-0']">
        <button
          type="button"
          class="mb-3 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-rose-700 lg:hidden"
          @click="backToList"
        >
          <ChevronLeft :size="18" class="rtl:rotate-180" />
          {{ t("All settings") }}
        </button>

        <div v-if="isLoading" class="ds-card space-y-3 p-6">
          <div v-for="i in 4" :key="i" class="h-10 animate-pulse rounded-lg bg-stone-100"></div>
        </div>

        <form v-else class="ds-card" @submit.prevent="saveSettings">
          <!-- Section heading -->
          <div class="border-b border-stone-200 px-5 py-4 sm:px-6">
            <h2 class="ds-section-title">{{ t(current.title) }}</h2>
            <p class="ds-section-sub">{{ t(current.sub) }}</p>
          </div>

          <div class="space-y-5 px-5 py-5 sm:px-6">
            <!-- ============ Business profile ============ -->
            <template v-if="shown === 'profile'">
              <p v-if="isBranch" class="flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-[13px] text-sky-900">
                <Building2 :size="16" class="mt-0.5 shrink-0" />
                <span>{{ t("This is a branch. Its logo and contact details come from the head office and are changed there.") }}</span>
              </p>
              <!-- Logo -->
              <div class="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <div class="relative shrink-0">
                  <img
                    v-if="displayLogo"
                    :src="displayLogo"
                    :alt="t('Logo preview')"
                    class="size-20 rounded-xl border border-stone-200 bg-white object-cover"
                  />
                  <div v-else class="flex size-20 items-center justify-center rounded-xl border border-dashed border-stone-300 bg-stone-50 text-stone-400">
                    <Building2 :size="28" />
                  </div>
                  <span v-if="logoPending" class="ds-pill ds-pill--info absolute -end-2 -top-2 !h-5 !px-2">{{ t("New") }}</span>
                </div>
                <div v-if="isBranch" class="min-w-0 flex-1">
                  <div class="ds-label !mb-0">{{ t("Business Logo") }}</div>
                  <p class="ds-help !mt-0">{{ t("Same as the head office.") }}</p>
                </div>
                <div v-else class="min-w-0 flex-1 space-y-2">
                  <div class="ds-label !mb-0">{{ t("Business Logo") }}</div>
                  <p class="ds-help !mt-0">
                    {{ t("PNG or JPG. We automatically crop it to a square and resize it — check the preview, then press “Set image”. Shown in the dashboard header and booking page.") }}
                  </p>
                  <div class="flex flex-wrap items-center gap-2">
                    <input ref="fileInput" type="file" accept="image/png,image/jpeg" class="hidden" @change="onLogoFileChange" />
                    <button type="button" class="ui-btn ui-btn-secondary" :disabled="isUploadingLogo" @click="fileInput?.click()">
                      <Loader2 v-if="isUploadingLogo" :size="16" class="animate-spin" />
                      <ImagePlus v-else :size="16" />
                      <span>{{ form.logoUrl ? t("Change logo") : t("Upload logo") }}</span>
                    </button>
                    <template v-if="logoPending">
                      <button type="button" class="ui-btn ui-btn-primary" :disabled="isUploadingLogo" @click="applyLogo">
                        <Check :size="16" />
                        <span>{{ t("Set image") }}</span>
                      </button>
                      <button type="button" class="ui-btn ui-btn-ghost" :disabled="isUploadingLogo" @click="cancelLogoPreview">
                        {{ t("Cancel") }}
                      </button>
                    </template>
                    <button v-else-if="form.logoUrl" type="button" class="ui-btn ui-btn-ghost !text-red-700" :disabled="isUploadingLogo" @click="removeLogo">
                      <Trash2 :size="16" />
                      <span>{{ t("Remove") }}</span>
                    </button>
                  </div>
                  <p v-if="logoError" class="flex items-center gap-1 text-xs font-semibold text-red-700">
                    <AlertCircle :size="14" />
                    <span>{{ logoError }}</span>
                  </p>
                </div>
              </div>

              <div class="grid gap-4 border-t border-stone-200 pt-5 sm:grid-cols-2">
                <div>
                  <label for="s-name" class="ds-label">{{ t("Business Name") }}</label>
                  <input id="s-name" v-model="form.name" type="text" required :disabled="isBranch && !headInBranch" class="w-full px-3" />
                  <p v-if="!isBranch" class="ds-help flex items-start gap-1" :class="nameLimit.cooling ? '!text-amber-700' : ''">
                    <CalendarClock :size="14" class="shrink-0" />
                    <span>{{ nameHint }}</span>
                  </p>
                </div>
                <div v-if="!isBranch">
                  <label for="s-slug" class="ds-label">{{ t("URL Slug") }}</label>
                  <input id="s-slug" v-model="form.slug" type="text" required :placeholder="t('maria-beauty-studio')" class="w-full px-3" />
                  <p class="ds-help">{{ t("Your booking page address:") }} <bdi dir="ltr" class="font-medium text-stone-700">/book/{{ form.slug || "…" }}</bdi></p>
                </div>
                <div>
                  <label for="s-email" class="ds-label">{{ t("Business Email") }}</label>
                  <input id="s-email" v-model="form.email" type="email" required :disabled="isBranch" class="w-full px-3" />
                  <p v-if="!isBranch" class="ds-help">{{ t("Shown to customers. Your login email is under Account security.") }}</p>
                </div>
                <div>
                  <label for="s-phone" class="ds-label">{{ t("Business Phone") }}</label>
                  <input id="s-phone" v-model="form.phone" type="tel" placeholder="+30 210..." :disabled="isBranch" class="w-full px-3" />
                </div>
                <div class="sm:col-span-2">
                  <label for="s-desc" class="ds-label">{{ t("Description") }}</label>
                  <textarea
                    id="s-desc"
                    v-model="form.description"
                    rows="3"
                    :disabled="isBranch"
                    :placeholder="t('Tell customers what sets your studio apart...')"
                    class="w-full px-3"
                  ></textarea>
                </div>
              </div>
            </template>

            <!-- ============ Business type (template) ============ -->
            <template v-if="shown === 'type'">
              <p class="text-[13px] text-stone-600">
                {{ t("Pick what fits your business. We suggest the right settings; you can still change each one later.") }}
              </p>
              <div class="grid gap-3 sm:grid-cols-2">
                <button
                  v-for="b in BUSINESS_TYPES"
                  :key="b.id"
                  type="button"
                  class="rounded-lg border p-4 text-start transition"
                  :class="form.businessType === b.id ? 'border-rose-600 bg-rose-50 ring-1 ring-rose-600' : 'border-stone-200 hover:border-stone-300'"
                  :aria-pressed="form.businessType === b.id"
                  @click="form.businessType = b.id; typeNote = ''"
                >
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-[15px] font-semibold text-stone-900">{{ t(b.name) }}</span>
                    <Check v-if="form.businessType === b.id" :size="18" class="text-rose-600" />
                  </div>
                  <p class="mt-1 text-[13px] text-stone-600">{{ t(b.description) }}</p>
                  <ul class="mt-2 grid gap-0.5 text-xs text-stone-500">
                    <li v-for="h in b.highlights" :key="h">• {{ t(h) }}</li>
                  </ul>
                </button>
              </div>
              <div class="flex flex-wrap items-center gap-3 rounded-lg border border-stone-200 bg-stone-50 p-3">
                <button type="button" class="ui-btn ui-btn-secondary" @click="applyType">
                  <RotateCcw :size="16" />
                  <span>{{ t("Apply recommended settings") }}</span>
                </button>
                <span class="text-[13px]" :class="typeNote ? 'font-medium text-emerald-700' : 'text-stone-500'">
                  {{ typeNote || t("Fills in tokens, location and booking times for this type. Nothing is saved until you press Save Changes.") }}
                </span>
              </div>
            </template>

            <!-- ============ Booking page ============ -->
            <template v-else-if="shown === 'booking'">
              <div class="rounded-xl border border-stone-200 bg-stone-50 p-3">
                <div class="ds-label">{{ t("Your Public Booking Page") }}</div>
                <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <bdi dir="ltr" class="min-w-0 flex-1 truncate rounded-lg border border-stone-200 bg-white px-3 py-2 font-mono text-xs text-stone-700">{{ bookingUrl }}</bdi>
                  <div class="flex gap-2">
                    <button type="button" class="ui-btn ui-btn-secondary flex-1" @click="copyLink">
                      <Check v-if="copied" :size="16" class="text-emerald-600" />
                      <Copy v-else :size="16" />
                      <span>{{ copied ? t("Copied!") : t("Copy Link") }}</span>
                    </button>
                    <NuxtLink :to="`/book/${form.slug}`" target="_blank" class="ui-btn ui-btn-secondary flex-1">
                      <ExternalLink :size="16" />
                      <span>{{ t("Open Page") }}</span>
                    </NuxtLink>
                  </div>
                </div>
                <p class="ds-help">{{ t("Share this URL on Instagram, Google Business, or WhatsApp to let clients book appointments 24/7.") }}</p>
              </div>

              <div class="grid gap-3">
                <SettingToggle
                  v-model="form.bookingActive"
                  :title="t('Online Booking')"
                  :description="t('Customers can book on your booking page. Turn off to pause new online bookings.')"
                />
                <template v-if="allowed('tokens')">
                  <SettingToggle
                    v-model="form.tokensEnabled"
                    :title="t('Token system')"
                    :description="t('Give every booking a queue number (01, 02…) with a printable ticket. Turn off if you do not use a queue.')"
                  />
                  <SettingToggle
                    v-model="form.showTokenToCustomer"
                    class="ms-6"
                    :disabled="!form.tokensEnabled"
                    :title="t('Show token to customer')"
                    :description="form.tokensEnabled ? t('After booking, the customer sees their token number to screenshot') : t('Turn on the token system first.')"
                  />
                </template>
                <SettingToggle
                  v-model="form.hidePricesInList"
                  :title="t('Hide prices on service list')"
                  :description="t('Price shows only after the customer picks a service')"
                />
                <SettingToggle
                  v-if="allowed('onLocation')"
                  v-model="form.onLocationEnabled"
                  :title="t('On-location service')"
                  :description="t('Customer shares location; staff are sent to them')"
                />
              </div>
              <p class="ds-help">
                {{ t("Booking times and breaks are set on") }}
                <NuxtLink to="/dashboard/hours" class="font-semibold text-rose-700 underline-offset-2 hover:underline">{{ t("Working Hours") }}</NuxtLink>.
              </p>
            </template>

            <!-- ============ Location & language ============ -->
            <template v-else-if="shown === 'region'">
              <div>
                <label for="s-address" class="ds-label">{{ t("Street Address") }}</label>
                <input
                  id="s-address"
                  v-model="form.address"
                  type="text"
                  autocomplete="street-address"
                  :placeholder="t('Street, building, area')"
                  class="w-full px-3"
                />
              </div>
              <RegionFields
                v-model:country="form.country"
                v-model:city="form.city"
                v-model:timezone="form.timezone"
                v-model:currency="form.currency"
                show-city
              />
              <div class="border-t border-stone-200 pt-5">
                <label for="business-language" class="ds-label">{{ t("Language") }}</label>
                <AppSelect id="business-language" v-model="form.language" class="w-full sm:max-w-xs">
                  <option v-for="l in LOCALES" :key="l.code" :value="l.code">{{ l.name }}</option>
                </AppSelect>
                <p class="ds-help">
                  {{ t("Your team sees the dashboard in this language, and customers see your booking page in it. Each person can still pick their own language from the top bar.") }}
                </p>
              </div>
            </template>

            <!-- ============ Theme ============ -->
            <template v-else-if="shown === 'theme'">
              <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
                <button
                  v-for="p in THEME_PRESETS"
                  :key="p.id"
                  type="button"
                  class="flex items-center gap-2.5 rounded-xl border p-2.5 text-start transition"
                  :class="(form.themeColor ?? null) === p.color ? 'border-rose-600 bg-rose-50 ring-1 ring-rose-600' : 'border-stone-200 hover:border-stone-300'"
                  :aria-pressed="(form.themeColor ?? null) === p.color"
                  @click="form.themeColor = p.color"
                >
                  <span class="grid size-8 shrink-0 place-items-center rounded-lg text-white" :style="{ backgroundColor: p.swatch }">
                    <Check v-if="(form.themeColor ?? null) === p.color" :size="16" :stroke-width="3" />
                  </span>
                  <span class="min-w-0 truncate text-sm font-medium text-stone-800">{{ t(p.name) }}</span>
                </button>
              </div>
              <div class="flex flex-wrap items-center gap-3 rounded-xl border border-stone-200 p-3">
                <label class="flex items-center gap-3 text-sm font-medium text-stone-800">
                  <input
                    type="color"
                    :value="form.themeColor ?? DEFAULT_BRAND"
                    class="!h-10 !w-12 cursor-pointer !p-1"
                    :aria-label="t('Custom colour')"
                    @input="form.themeColor = ($event.target as HTMLInputElement).value"
                  />
                  {{ t("Custom colour") }}
                  <span class="font-mono text-xs uppercase text-stone-500">{{ form.themeColor ?? t("Default") }}</span>
                </label>
                <button v-if="form.themeColor" type="button" class="ui-btn ui-btn-ghost ms-auto" @click="form.themeColor = null">
                  <RotateCcw :size="16" /> {{ t("Reset to default") }}
                </button>
              </div>
              <div class="brand-theme flex flex-wrap items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 p-4" :style="{ '--brand': form.themeColor ?? DEFAULT_BRAND }">
                <span class="text-xs font-medium text-stone-500">{{ t("Preview") }}</span>
                <span class="inline-flex h-9 items-center rounded-lg bg-rose-600 px-4 text-sm font-semibold text-white">{{ t("Book now") }}</span>
                <span class="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">{{ t("Confirmed") }}</span>
                <span class="text-sm font-semibold text-rose-600">{{ t("Share Booking Link") }}</span>
              </div>
            </template>

            <!-- ============ Team ============ -->
            <TeamPanel v-else-if="shown === 'team'" />

            <!-- ============ Account security ============ -->
            <template v-else-if="shown === 'security'">
              <div class="grid gap-4 xl:grid-cols-2">
                <!-- Login email -->
                <div class="space-y-3 rounded-xl border border-stone-200 p-4">
                  <div class="flex items-center gap-2 text-sm font-semibold text-stone-900">
                    <KeyRound :size="16" class="text-stone-400" />
                    {{ t("Login Email") }}
                  </div>
                  <p class="break-all text-sm text-stone-600">
                    {{ t("Current:") }} <span class="font-semibold text-stone-900">{{ currentEmail || "—" }}</span>
                  </p>
                  <div v-if="emailStep === 'idle'" class="flex flex-col gap-2 sm:flex-row">
                    <input v-model="newEmail" type="email" :placeholder="t('New email address')" class="min-w-0 flex-1 px-3" />
                    <button type="button" class="ui-btn ui-btn-primary" :disabled="emailBusy || !newEmail.trim()" @click="requestEmailChange">
                      <Loader2 v-if="emailBusy" :size="16" class="animate-spin" />
                      <span>{{ t("Send code") }}</span>
                    </button>
                  </div>
                  <template v-else>
                    <p class="text-xs text-stone-500">
                      {{ t("Code sent to") }} <span class="font-semibold">{{ currentEmail }}</span>{{ t(". Enter it below to approve the change to") }}
                      <span class="font-semibold">{{ newEmail }}</span>.
                    </p>
                    <input v-model="emailCode" inputmode="numeric" maxlength="6" placeholder="••••••" class="w-full text-center text-lg font-bold tracking-[0.4em]" />
                    <div class="flex gap-2">
                      <button type="button" class="ui-btn ui-btn-primary flex-1" :disabled="emailBusy || emailCode.trim().length !== 6" @click="confirmEmailChange">
                        <Loader2 v-if="emailBusy" :size="16" class="animate-spin" />
                        <span>{{ t("Confirm change") }}</span>
                      </button>
                      <button type="button" class="ui-btn ui-btn-secondary" :disabled="emailBusy" @click="emailStep = 'idle'; emailError = ''; emailNotice = ''">
                        {{ t("Cancel") }}
                      </button>
                    </div>
                  </template>
                  <p v-if="emailError" class="flex items-start gap-1 text-xs font-semibold text-red-700">
                    <AlertCircle :size="14" class="shrink-0" />
                    <span>{{ emailError }}</span>
                  </p>
                  <p v-if="emailNotice" class="flex items-start gap-1 text-xs font-medium text-emerald-700">
                    <Check :size="14" class="shrink-0" />
                    <span>{{ emailNotice }}</span>
                  </p>
                </div>

                <!-- Mobile number -->
                <div class="space-y-3 rounded-xl border border-stone-200 p-4">
                  <div class="flex items-center gap-2 text-sm font-semibold text-stone-900">
                    <Smartphone :size="16" class="text-stone-400" />
                    {{ t("Account Mobile Number") }}
                  </div>
                  <p class="break-all text-sm text-stone-600">
                    {{ t("Current:") }} <span class="font-semibold text-stone-900">{{ accountPhone || t("Not set") }}</span>
                  </p>
                  <div v-if="phoneStep === 'idle'" class="flex flex-col gap-2 sm:flex-row">
                    <input v-model="newPhone" type="tel" placeholder="+30 69..." class="min-w-0 flex-1 px-3" />
                    <button type="button" class="ui-btn ui-btn-primary" :disabled="phoneBusy || !newPhone.trim()" @click="requestPhoneChange">
                      <Loader2 v-if="phoneBusy" :size="16" class="animate-spin" />
                      <span>{{ t("Send code") }}</span>
                    </button>
                  </div>
                  <template v-else>
                    <p class="text-xs text-stone-500">
                      {{ t("Code sent to") }} <span class="font-semibold">{{ currentEmail }}</span>{{ t(". Enter it below to approve the change to") }}
                      <span class="font-semibold">{{ newPhone }}</span>.
                    </p>
                    <input v-model="phoneCode" inputmode="numeric" maxlength="6" placeholder="••••••" class="w-full text-center text-lg font-bold tracking-[0.4em]" />
                    <div class="flex gap-2">
                      <button type="button" class="ui-btn ui-btn-primary flex-1" :disabled="phoneBusy || phoneCode.trim().length !== 6" @click="confirmPhoneChange">
                        <Loader2 v-if="phoneBusy" :size="16" class="animate-spin" />
                        <span>{{ t("Confirm change") }}</span>
                      </button>
                      <button type="button" class="ui-btn ui-btn-secondary" :disabled="phoneBusy" @click="phoneStep = 'idle'; phoneError = ''; phoneNotice = ''">
                        {{ t("Cancel") }}
                      </button>
                    </div>
                  </template>
                  <p v-if="phoneError" class="flex items-start gap-1 text-xs font-semibold text-red-700">
                    <AlertCircle :size="14" class="shrink-0" />
                    <span>{{ phoneError }}</span>
                  </p>
                  <p v-if="phoneNotice" class="flex items-start gap-1 text-xs font-medium text-emerald-700">
                    <Check :size="14" class="shrink-0" />
                    <span>{{ phoneNotice }}</span>
                  </p>
                </div>
              </div>
            </template>
          </div>

          <!-- Save bar (not needed for account security: those save with codes) -->
          <div
            v-if="shown !== 'security' && shown !== 'team' && !(shown === 'profile' && isBranch && !headInBranch)"
            class="sticky bottom-0 flex flex-col gap-3 rounded-b-xl border-t border-stone-200 bg-white/95 px-5 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-6"
          >
            <p v-if="errorMessage" class="flex items-center gap-2 text-sm font-medium text-red-700">
              <AlertCircle :size="16" class="shrink-0" />
              <span>{{ errorMessage }}</span>
            </p>
            <p v-else-if="successMessage" class="flex items-center gap-2 text-sm font-medium text-emerald-700">
              <Check :size="16" class="shrink-0" />
              <span>{{ successMessage }}</span>
            </p>
            <p v-else class="text-[13px] text-stone-500">{{ t("Changes in every section are saved together.") }}</p>
            <button type="submit" class="ui-btn ui-btn-primary w-full sm:w-auto" :disabled="isSaving">
              <Loader2 v-if="isSaving" :size="16" class="animate-spin" />
              <Save v-else :size="16" />
              <span>{{ isSaving ? t("Saving...") : t("Save Changes") }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
