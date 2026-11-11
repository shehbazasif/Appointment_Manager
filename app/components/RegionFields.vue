<script setup lang="ts">
import { computed } from "vue";
const { t, intl } = useT();

/**
 * Country -> city, time zone + currency picker (all searchable dropdowns).
 * Choosing a country fills in its time zone and currency automatically
 * (they can still be changed). City allows typing a city that is not listed.
 */
const country = defineModel<string>("country", { default: "" });
const city = defineModel<string>("city", { default: "" });
const timezone = defineModel<string>("timezone", { default: "" });
const currency = defineModel<string>("currency", { default: "" });

const props = withDefaults(defineProps<{ showCurrency?: boolean; showCity?: boolean }>(), {
  showCurrency: true,
  showCity: false,
});

const selected = computed(() => findRegionCountry(country.value));

// ---- Country ----
const countryOptions = REGION_COUNTRIES.map((c) => ({
  value: c.iso,
  label: `${flagOf(c.iso)}  ${c.name}`,
  hint: c.iso,
  keywords: c.name,
}));
const countryIso = computed({
  get: () => selected.value?.iso ?? "",
  set: (iso: string) => {
    const entry = REGION_COUNTRIES.find((c) => c.iso === iso);
    if (!entry) return;
    const changed = entry.name !== country.value;
    country.value = entry.name;
    const region = COUNTRY_REGION[iso];
    if (region) {
      if (!region.zones.includes(timezone.value)) timezone.value = region.zones[0]!;
      currency.value = region.currency;
    }
    // a city from the previous country no longer fits
    if (changed && city.value && !(COUNTRY_CITIES[iso] ?? []).includes(city.value)) city.value = "";
  },
});

// ---- City (country's main cities; anything else can be typed) ----
const cityOptions = computed(() => {
  const list = selected.value ? (COUNTRY_CITIES[selected.value.iso] ?? []) : [];
  const all = city.value && !list.includes(city.value) ? [city.value, ...list] : list;
  return all.map((c) => ({ value: c, label: c }));
});

// ---- Time zone (own country first, then all) ----
const offsetOf = (tz: string) => {
  try {
    return (
      new Intl.DateTimeFormat(intl.value, { timeZone: tz, timeZoneName: "shortOffset" })
        .formatToParts(new Date())
        .find((p) => p.type === "timeZoneName")?.value ?? ""
    );
  } catch {
    return "";
  }
};
const zoneOptions = computed(() => {
  const own = selected.value ? (COUNTRY_REGION[selected.value.iso]?.zones ?? []) : [];
  const group = selected.value?.name ?? "";
  const rest = allTimeZones().filter((z) => !own.includes(z));
  const extra = timezone.value && !own.includes(timezone.value) && !rest.includes(timezone.value) ? [timezone.value] : [];
  const make = (z: string, g: string) => ({
    value: z,
    label: z.replace(/_/g, " "),
    hint: offsetOf(z),
    group: g,
  });
  return [
    ...own.map((z) => make(z, group || t("Your country"))),
    ...[...extra, ...rest].map((z) => make(z, t("All time zones"))),
  ];
});

// ---- Currency ----
const currencyOptions = computed(() => {
  const codes =
    currency.value && !CURRENCIES.includes(currency.value.toUpperCase())
      ? [currency.value.toUpperCase(), ...CURRENCIES]
      : CURRENCIES;
  const own = selected.value ? COUNTRY_REGION[selected.value.iso]?.currency : undefined;
  const ordered = own ? [own, ...codes.filter((c) => c !== own)] : codes;
  return ordered.map((c) => ({
    value: c,
    label: `${c} · ${currencyName(c)}`,
    hint: formatMoney(1000, c),
  }));
});

const nowInZone = computed(() => {
  if (!timezone.value) return "";
  try {
    return new Intl.DateTimeFormat(intl.value, {
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

const labelClass = "block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5";
const cols = computed(() => {
  const n = 2 + (props.showCity ? 1 : 0) + (props.showCurrency ? 1 : 0);
  return n >= 4 ? "sm:grid-cols-2 lg:grid-cols-4" : n === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2";
});
</script>

<template>
  <div :class="['grid gap-4', cols]">
    <div>
      <label :class="labelClass" for="region-country">{{ t("Country") }}</label>
      <SearchSelect
        id="region-country"
        v-model="countryIso"
        :options="countryOptions"
        :placeholder="t('Select your country')"
        :search-placeholder="t('Search country…')"
      />
      <p v-if="country && !selected" class="mt-1 text-[11px] text-amber-700">
        {{ t('Saved as "{country}". Pick it from the list to set time zone and currency.', { country }) }}
      </p>
    </div>

    <div v-if="props.showCity">
      <label :class="labelClass" for="region-city">{{ t("City") }}</label>
      <SearchSelect
        id="region-city"
        v-model="city"
        :options="cityOptions"
        allow-custom
        :placeholder="selected ? 'Select or type your city' : 'Type your city'"
        :search-placeholder="t('Search or type a city…')"
      />
    </div>

    <div>
      <label :class="labelClass" for="region-tz">{{ t("Time zone") }}</label>
      <SearchSelect
        id="region-tz"
        v-model="timezone"
        :options="zoneOptions"
        :placeholder="t('Select time zone')"
        :search-placeholder="t('Search city or zone, e.g. Doha')"
      />
      <p v-if="nowInZone" class="mt-1 text-[11px] text-stone-500">Local time there now: {{ nowInZone }}</p>
    </div>

    <div v-if="props.showCurrency">
      <label :class="labelClass" for="region-currency">{{ t("Currency") }}</label>
      <SearchSelect
        id="region-currency"
        v-model="currency"
        :options="currencyOptions"
        :placeholder="t('Select currency')"
        :search-placeholder="t('Search, e.g. riyal, PKR')"
      />
    </div>
  </div>
</template>
