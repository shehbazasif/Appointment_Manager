<script setup lang="ts">
import { computed } from "vue";

/**
 * Country -> time zone + currency picker. Choosing a country fills in its
 * time zone and currency automatically (they can still be changed).
 */
const country = defineModel<string>("country", { default: "" });
const timezone = defineModel<string>("timezone", { default: "" });
const currency = defineModel<string>("currency", { default: "" });

const props = withDefaults(defineProps<{ showCurrency?: boolean }>(), {
  showCurrency: true,
});

const selected = computed(() => findRegionCountry(country.value));
const countryIso = computed({
  get: () => selected.value?.iso ?? "",
  set: (iso: string) => {
    const entry = REGION_COUNTRIES.find((c) => c.iso === iso);
    if (!entry) return;
    country.value = entry.name;
    const region = COUNTRY_REGION[iso];
    if (region) {
      if (!region.zones.includes(timezone.value)) timezone.value = region.zones[0]!;
      currency.value = region.currency;
    }
  },
});

// Zones of the chosen country first, then every other zone
const zoneOptions = computed(() => {
  const own = selected.value ? (COUNTRY_REGION[selected.value.iso]?.zones ?? []) : [];
  const rest = allTimeZones().filter((z) => !own.includes(z));
  const current = timezone.value && !own.includes(timezone.value) && !rest.includes(timezone.value)
    ? [timezone.value]
    : [];
  return { own, rest: [...current, ...rest] };
});

const currencyOptions = computed(() =>
  currency.value && !CURRENCIES.includes(currency.value.toUpperCase())
    ? [currency.value.toUpperCase(), ...CURRENCIES]
    : CURRENCIES,
);

const nowInZone = computed(() => {
  if (!timezone.value) return "";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone.value,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date());
  } catch {
    return "";
  }
});

const fieldClass =
  "w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-xs outline-none focus:border-stone-900 focus:bg-white";
const labelClass = "block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5";
</script>

<template>
  <div :class="['grid gap-4', props.showCurrency ? 'sm:grid-cols-3' : 'sm:grid-cols-2']">
    <div>
      <label :class="labelClass" for="region-country">Country</label>
      <select id="region-country" v-model="countryIso" :class="fieldClass">
        <option value="" disabled>Select your country</option>
        <option v-for="c in REGION_COUNTRIES" :key="c.iso" :value="c.iso">
          {{ flagOf(c.iso) }} {{ c.name }}
        </option>
      </select>
      <p v-if="country && !selected" class="mt-1 text-[11px] text-amber-700">
        Saved as "{{ country }}". Pick it from the list to set time zone and currency.
      </p>
    </div>

    <div>
      <label :class="labelClass" for="region-tz">Time zone</label>
      <select id="region-tz" v-model="timezone" :class="fieldClass">
        <option value="" disabled>Select time zone</option>
        <optgroup v-if="zoneOptions.own.length" :label="selected?.name ?? 'Your country'">
          <option v-for="z in zoneOptions.own" :key="z" :value="z">{{ timeZoneLabel(z) }}</option>
        </optgroup>
        <optgroup label="All time zones">
          <option v-for="z in zoneOptions.rest" :key="z" :value="z">{{ z.replace(/_/g, " ") }}</option>
        </optgroup>
      </select>
      <p v-if="nowInZone" class="mt-1 text-[11px] text-stone-500">Local time there now: {{ nowInZone }}</p>
    </div>

    <div v-if="props.showCurrency">
      <label :class="labelClass" for="region-currency">Currency</label>
      <select id="region-currency" v-model="currency" :class="fieldClass">
        <option v-for="c in currencyOptions" :key="c" :value="c">{{ c }} · {{ formatMoney(1000, c) }}</option>
      </select>
    </div>
  </div>
</template>
