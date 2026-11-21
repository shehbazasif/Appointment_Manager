<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { MapPin, Check, X, ExternalLink } from "lucide-vue-next";
const { t } = useT();

/**
 * Customer location for on-location bookings made by the team.
 * The customer sends a Google Maps link on WhatsApp; paste it here. It is
 * saved as soon as it is pasted (no need to press Set), also short links
 * (maps.app.goo.gl) that do not contain coordinates.
 */
interface LocationValue {
  lat?: number | null;
  lng?: number | null;
  accuracy?: number | null;
  note?: string | null;
  url?: string | null;
}
const model = defineModel<LocationValue | null>({ default: null });

const link = ref(model.value?.url ?? (model.value?.lat != null ? `${model.value.lat}, ${model.value.lng}` : ""));
const note = ref(model.value?.note ?? "");
const error = ref("");
const confirmed = ref(!!(model.value?.url || model.value?.lat != null));

/** Finds "lat,lng" in a Google/Apple Maps link or plain text. */
const parseCoords = (text: string): { lat: number; lng: number } | null => {
  let s = text.trim();
  try {
    s = decodeURIComponent(s);
  } catch {}
  const patterns = [
    /@(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/,
    /[?&](?:q|query|ll|destination|daddr)=(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/,
    /!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/,
    /^(-?\d{1,2}(?:\.\d+)?)\s*[, ]\s*(-?\d{1,3}(?:\.\d+)?)$/,
  ];
  for (const re of patterns) {
    const m = s.match(re);
    if (m) {
      const lat = Number(m[1]);
      const lng = Number(m[2]);
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
    }
  }
  return null;
};
/** a link inside pasted WhatsApp text, e.g. "Location: https://maps.app.goo.gl/abc" */
const findUrl = (text: string) => text.match(/https?:\/\/\S+/i)?.[0]?.replace(/[)\].,]+$/, "") ?? "";

/** Save whatever was pasted right away (Set only confirms it). */
const sync = () => {
  error.value = "";
  const raw = link.value.trim();
  const url = findUrl(raw);
  const c = parseCoords(url || raw);
  if (!raw) {
    model.value = note.value.trim() ? { note: note.value.trim() } : null;
    confirmed.value = false;
    return;
  }
  if (!url && !c) {
    error.value = t("Paste the Google Maps link the customer sent (it starts with https://).");
    model.value = note.value.trim() ? { note: note.value.trim() } : null;
    return;
  }
  model.value = {
    lat: c ? Number(c.lat.toFixed(6)) : null,
    lng: c ? Number(c.lng.toFixed(6)) : null,
    accuracy: null,
    url: url || null,
    note: note.value.trim() || null,
  };
};
watch(link, () => {
  confirmed.value = false;
  sync();
});
watch(note, sync);

const confirm = () => {
  sync();
  if (!error.value && model.value && (model.value.url || model.value.lat != null)) confirmed.value = true;
};
const clear = () => {
  link.value = "";
  note.value = "";
  model.value = null;
  confirmed.value = false;
};

const openUrl = computed(() =>
  model.value?.url || (model.value?.lat != null ? `https://www.google.com/maps?q=${model.value.lat},${model.value.lng}` : ""),
);
</script>

<template>
  <div class="space-y-2.5 rounded-lg border border-stone-200 bg-stone-50 p-3">
    <div class="flex items-center gap-2">
      <MapPin :size="16" class="text-rose-600" />
      <span class="text-[13px] font-semibold text-stone-800">{{ t("Customer location (Google Maps link)") }}</span>
    </div>

    <div class="flex gap-2">
      <input
        v-model="link"
        type="text"
        inputmode="url"
        autocapitalize="off"
        autocomplete="off"
        :placeholder="t('Paste the link from WhatsApp')"
        class="min-w-0 flex-1 px-3"
        :class="confirmed ? '!border-emerald-500' : ''"
        @keydown.enter.prevent="confirm"
      />
      <button v-if="!confirmed" type="button" class="ui-btn ui-btn-primary shrink-0" @click="confirm">
        {{ t("Set") }}
      </button>
      <button v-else type="button" class="ui-btn ui-btn-secondary ui-btn-icon shrink-0" :aria-label="t('Remove location')" @click="clear">
        <X :size="16" />
      </button>
    </div>

    <p v-if="openUrl && !error" class="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-emerald-700">
      <span class="inline-flex items-center gap-1 font-medium"><Check :size="15" /> {{ t("Location saved with the booking") }}</span>
      <a :href="openUrl" target="_blank" rel="noopener" class="inline-flex items-center gap-1 font-semibold underline">
        {{ t("Check on map") }} <ExternalLink :size="13" />
      </a>
    </p>
    <p v-if="error" class="rounded-md border border-red-200 bg-red-50 p-2 text-[13px] text-red-700" role="alert">{{ error }}</p>

    <input
      v-model="note"
      type="text"
      maxlength="300"
      :placeholder="t('Address / landmark (optional)')"
      class="w-full px-3"
    />
  </div>
</template>
