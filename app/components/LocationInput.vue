<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { MapPin, Crosshair, X } from "lucide-vue-next";
const { t } = useT();

/**
 * Customer location for on-location bookings made by the manager.
 * Paste a Google Maps link / "lat, lng", or use this device's GPS
 * (when the manager is standing at the customer's place).
 */
interface LocationValue {
  lat: number;
  lng: number;
  accuracy?: number | null;
  note?: string | null;
}
const model = defineModel<LocationValue | null>({ default: null });

const pasted = ref("");
const note = ref(model.value?.note ?? "");
const error = ref("");
const busy = ref(false);

watch(
  () => model.value,
  (v) => {
    if (!v) return;
    if ((v.note ?? "") !== note.value) note.value = v.note ?? "";
  },
);
watch(note, (n) => {
  if (model.value) model.value = { ...model.value, note: n || null };
});

const mapsLink = computed(() =>
  model.value ? `https://www.google.com/maps?q=${model.value.lat},${model.value.lng}` : "",
);

/** Finds "lat,lng" in a Google/Apple Maps link or plain text. */
const parseCoords = (text: string): { lat: number; lng: number } | null => {
  const t = decodeURIComponent(text.trim());
  const patterns = [
    /@(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/, // .../@24.86,67.01,15z
    /[?&](?:q|query|ll|destination|daddr)=(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/, // ?q=24.86,67.01
    /!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/, // place links
    /^(-?\d{1,2}(?:\.\d+)?)\s*[, ]\s*(-?\d{1,3}(?:\.\d+)?)$/, // "24.86, 67.01"
  ];
  for (const re of patterns) {
    const m = t.match(re);
    if (m) {
      const lat = Number(m[1]);
      const lng = Number(m[2]);
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
    }
  }
  return null;
};

const applyPasted = () => {
  error.value = "";
  if (!pasted.value.trim()) return;
  const c = parseCoords(pasted.value);
  if (!c) {
    error.value = /goo\.gl|maps\.app/i.test(pasted.value)
      ? t("Short links can't be read. Open the link, then copy the full address-bar link (or long-press the pin and copy the numbers like 24.8607, 67.0011).")
      : t("Couldn't find a location in that text. Paste a Google Maps link or numbers like 24.8607, 67.0011.");
    return;
  }
  model.value = { lat: Number(c.lat.toFixed(6)), lng: Number(c.lng.toFixed(6)), accuracy: null, note: note.value || null };
  pasted.value = "";
};

const useDevice = () => {
  error.value = "";
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    error.value = t("This browser can't share a location.");
    return;
  }
  if (!window.isSecureContext) {
    error.value = t("Location only works on the https:// website.");
    return;
  }
  busy.value = true;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      busy.value = false;
      model.value = {
        lat: Number(pos.coords.latitude.toFixed(6)),
        lng: Number(pos.coords.longitude.toFixed(6)),
        accuracy: Math.round(pos.coords.accuracy),
        note: note.value || null,
      };
    },
    (err) => {
      busy.value = false;
      error.value =
        err.code === err.PERMISSION_DENIED
          ? t("Location permission was denied. On iPhone: Settings > Privacy & Security > Location Services > Safari Websites > While Using the App.")
          : t("Couldn't get this device's location. Paste a Maps link instead.");
    },
    { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
  );
};

const clear = () => {
  model.value = null;
  note.value = "";
};
</script>

<template>
  <div class="space-y-2.5 rounded-2xl border border-stone-200 bg-stone-50/60 p-3.5">
    <div class="flex items-center gap-2">
      <MapPin :size="15" class="text-rose-600" />
      <span class="text-xs font-bold uppercase tracking-wider text-stone-600">{{ t("Customer location") }}</span>
    </div>

    <div
      v-if="model"
      class="flex items-start justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800"
    >
      <div class="min-w-0">
        <div class="font-bold">{{ t("Location saved") }}</div>
        <div class="truncate">
          {{ model.lat }}, {{ model.lng }}<span v-if="model.accuracy"> (± {{ model.accuracy }} m)</span>
        </div>
        <a :href="mapsLink" target="_blank" rel="noopener" class="font-bold underline">{{ t("Check on map") }}</a>
      </div>
      <button
        type="button"
        class="tap grid shrink-0 place-items-center rounded-lg text-emerald-700 hover:bg-emerald-100"
        :aria-label="t('Remove location')"
        :title="t('Remove location')"
        @click="clear"
      >
        <X :size="16" />
      </button>
    </div>

    <div class="flex gap-2">
      <input
        v-model="pasted"
        type="text"
        inputmode="url"
        autocapitalize="off"
        :placeholder="t('Paste Google Maps link or 24.86, 67.01')"
        class="min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-stone-900"
        @keydown.enter.prevent="applyPasted"
        @blur="applyPasted"
      />
      <button
        type="button"
        class="tap shrink-0 rounded-xl border border-stone-900 bg-white px-3 text-xs font-bold text-stone-900"
        @click="applyPasted"
      >
        {{ t("Set") }}
      </button>
    </div>

    <button
      type="button"
      :disabled="busy"
      class="tap inline-flex w-full items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white py-2.5 text-xs font-bold text-stone-800 disabled:opacity-50"
      @click="useDevice"
    >
      <Crosshair :size="14" />
      {{ busy ? t("Getting location...") : t("Use this device's location (I'm at the customer)") }}
    </button>

    <input
      v-model="note"
      type="text"
      maxlength="300"
      :placeholder="t('Address / landmark (optional)')"
      class="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-stone-900"
    />
    <p v-if="error" class="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700" role="alert">{{ error }}</p>
    <p v-else class="text-[11px] text-stone-500">
      {{ t("Saved with the booking and sent to the assigned staff in the WhatsApp job message.") }}
    </p>
  </div>
</template>
