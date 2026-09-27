<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import {
  Share2,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  MessageCircle,
  Mail,
} from "lucide-vue-next";

definePageMeta({
  layout: "dashboard",
});

interface OrgSettings {
  name: string;
  slug: string;
  bookingActive: boolean;
  currency?: string;
}

const org = ref<OrgSettings | null>(null);
const isLoading = ref(true);
const isSaving = ref(false);
const copied = ref(false);
const qrSize = 256;

const loadOrg = async () => {
  isLoading.value = true;
  try {
    org.value = await $fetch<OrgSettings>("/api/organization");
  } finally {
    isLoading.value = false;
  }
};

onMounted(loadOrg);

const bookingUrl = computed(() => {
  if (!org.value?.slug) return "";
  if (import.meta.client) {
    return `${window.location.origin}/book/${org.value.slug}`;
  }
  return `/book/${org.value.slug}`;
});

const copyLink = async () => {
  if (!bookingUrl.value) return;
  try {
    await navigator.clipboard.writeText(bookingUrl.value);
    copied.value = true;
    setTimeout(() => (copied.value = false), 2000);
  } catch (e) {
    console.error("Failed to copy", e);
  }
};

const whatsappShare = () => {
  if (!bookingUrl.value) return;
  const text = encodeURIComponent(
    `Book your appointment at ${org.value?.name ?? "our studio"}: ${bookingUrl.value}`,
  );
  window.open(`https://wa.me/?text=${text}`, "_blank");
};

const emailShare = () => {
  if (!bookingUrl.value) return;
  const subject = encodeURIComponent(`Book with ${org.value?.name ?? "us"}`);
  const body = encodeURIComponent(
    `Hi!\n\nYou can book your appointment online, any time:\n${bookingUrl.value}\n\nSee you soon!`,
  );
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
};

const saveToggle = async () => {
  if (!org.value) return;
  isSaving.value = true;
  try {
    const updated = await $fetch<OrgSettings>("/api/organization", {
      method: "PATCH",
      body: { bookingActive: org.value.bookingActive },
    });
    org.value.bookingActive = updated.bookingActive;
  } finally {
    isSaving.value = false;
  }
};

const qrSrc = computed(() => {
  if (!bookingUrl.value) return "";
  return `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(bookingUrl.value)}`;
});
</script>

<template>
  <div class="space-y-7 pb-16 max-w-4xl">
    <!-- Header -->
    <div>
      <p class="text-xs font-bold uppercase tracking-wider text-rose-600">Share &amp; Grow</p>
      <h1 class="font-display text-3xl font-bold tracking-tight text-stone-900">Share Booking Link</h1>
      <p class="text-xs text-stone-500 mt-1">
        One link for customers to book appointments 24/7 — put it on Instagram, Google Business, or WhatsApp.
      </p>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="space-y-4">
      <div v-for="i in 2" :key="i" class="h-40 rounded-3xl bg-stone-200/60 animate-pulse"></div>
    </div>

    <template v-else-if="org">
      <!-- Link card -->
      <div class="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm space-y-5">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span class="text-[10px] font-bold uppercase tracking-wider text-rose-600">Customer Booking Hub</span>
            <h2 class="font-display text-xl font-bold text-stone-900 mt-0.5">Your Public Booking Page</h2>
          </div>
          <div class="flex items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-2.5">
            <span class="text-xs font-bold text-stone-800">Online Booking</span>
            <input
              type="checkbox"
              v-model="org.bookingActive"
              @change="saveToggle"
              :disabled="isSaving"
              class="size-4.5 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
            />
          </div>
        </div>

        <!-- URL bar -->
        <div class="flex flex-col sm:flex-row items-center gap-2 rounded-2xl border border-stone-200 bg-stone-50/70 p-2">
          <div class="flex-1 px-3 py-1.5 font-mono text-xs text-stone-700 truncate w-full">
            {{ bookingUrl }}
          </div>
          <div class="flex items-center gap-1.5 w-full sm:w-auto">
            <button
              type="button"
              @click="copyLink"
              class="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-bold text-stone-700 hover:bg-stone-100 transition"
            >
              <Check v-if="copied" :size="14" class="text-emerald-600" />
              <Copy v-else :size="14" class="text-stone-400" />
              <span>{{ copied ? "Copied!" : "Copy Link" }}</span>
            </button>
            <NuxtLink
              :to="`/book/${org.slug}`"
              target="_blank"
              class="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-bold text-white hover:bg-stone-800 transition"
            >
              <ExternalLink :size="14" />
              <span>Open Page</span>
            </NuxtLink>
          </div>
        </div>

        <!-- Share buttons -->
        <div class="grid gap-2.5 sm:grid-cols-2">
          <button
            type="button"
            @click="whatsappShare"
            class="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition"
          >
            <MessageCircle :size="16" />
            <span>Share on WhatsApp</span>
          </button>
          <button
            type="button"
            @click="emailShare"
            class="inline-flex items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-xs font-bold text-stone-700 hover:bg-stone-100 transition"
          >
            <Mail :size="16" />
            <span>Share via Email</span>
          </button>
        </div>
      </div>

      <!-- QR card -->
      <div class="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm flex flex-col sm:flex-row items-center gap-6">
        <div class="rounded-2xl border border-stone-200 bg-white p-2 shadow-2xs shrink-0">
          <img
            v-if="qrSrc"
            :src="qrSrc"
            alt="Booking page QR code"
            :width="qrSize"
            :height="qrSize"
            class="rounded-xl"
          />
        </div>
        <div class="space-y-3">
          <div class="flex items-center gap-2">
            <QrCode :size="18" class="text-rose-600" />
            <h3 class="font-display text-lg font-bold text-stone-900">QR code for your counter or window</h3>
          </div>
          <p class="text-xs text-stone-600 leading-relaxed">
            Print it and stick it at the reception — customers scan and book instantly. Download the image and send it to any print shop.
          </p>
          <div class="flex items-center gap-3">
            <a
              :href="qrSrc"
              download="booking-qr.png"
              target="_blank"
              class="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-bold text-white hover:bg-stone-800 transition"
            >
              <Share2 :size="14" />
              <span>Download QR</span>
            </a>
            <NuxtLink
              to="/dashboard/settings"
              class="text-xs font-bold text-stone-500 hover:text-stone-900 transition"
            >
              Booking page settings →
            </NuxtLink>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
