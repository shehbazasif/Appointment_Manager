<script setup lang="ts">
// Head office Home: totals for all branches + one box per branch.
// Only rendered for head-office members (the server refuses branches too).
import { Plus, Loader2, X, AlertCircle, ArrowRight } from "lucide-vue-next";
const { t, intl } = useT();

interface Stat { total: number; completed: number; open: number; cancelled: number; revenue: number }
interface BranchStat extends Stat { id: string; name: string; city: string | null; isHead: boolean }
interface Summary { period: string; currency: string | null; totals: Stat; branches: BranchStat[] }

const PERIODS = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
] as const;
const period = ref<(typeof PERIODS)[number]["value"]>("today");
const data = ref<Summary | null>(null);
const loading = ref(true);
const loadError = ref("");

const load = async () => {
  loading.value = true;
  loadError.value = "";
  try {
    data.value = await $fetch<Summary>("/api/branches/summary", { query: { period: period.value } });
  } catch (e: any) {
    loadError.value = e?.data?.statusMessage ?? t("Could not load the branches.");
  } finally {
    loading.value = false;
  }
};
watch(period, load);
onMounted(load);

const money = (v: number) => {
  try {
    return new Intl.NumberFormat(intl.value, { style: "currency", currency: data.value?.currency || "EUR", maximumFractionDigits: 0 }).format(v);
  } catch {
    return String(Math.round(v));
  }
};

// Add branch
const showAdd = ref(false);
const newName = ref("");
const newCity = ref("");
const adding = ref(false);
const addError = ref("");
const addBranch = async () => {
  addError.value = "";
  if (newName.value.trim().length < 2) {
    addError.value = t("Enter the branch name.");
    return;
  }
  adding.value = true;
  try {
    await $fetch("/api/branches", { method: "POST", body: { name: newName.value.trim(), city: newCity.value.trim() || undefined } });
    showAdd.value = false;
    newName.value = newCity.value = "";
    // reload so the "Working in" list shows the new branch too
    window.location.reload();
  } catch (e: any) {
    addError.value = e?.data?.statusMessage ?? t("Could not add the branch.");
  } finally {
    adding.value = false;
  }
};
</script>

<template>
  <section class="space-y-3">
    <!-- period -->
    <div class="grid grid-cols-3 rounded-lg border border-stone-200 bg-white p-1">
      <button
        v-for="p in PERIODS"
        :key="p.value"
        type="button"
        class="min-h-10 rounded-md text-[14px] font-semibold transition"
        :class="period === p.value ? 'bg-rose-600 text-white' : 'text-stone-600'"
        @click="period = p.value"
      >
        {{ t(p.label) }}
      </button>
    </div>

    <p v-if="loadError" class="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-[13px] text-red-700">
      <AlertCircle :size="16" /> {{ loadError }}
    </p>

    <!-- all branches together, one simple line -->
    <div class="ds-card flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3">
      <span class="text-[14px] font-semibold text-stone-900">{{ t("All branches") }}</span>
      <span v-if="loading" class="text-stone-400"><Loader2 :size="16" class="animate-spin" /></span>
      <span v-else class="text-[14px] tabular-nums text-stone-700">
        <b class="text-emerald-700">{{ data?.totals.completed ?? 0 }}</b> {{ t("done") }} ·
        <b class="text-amber-700">{{ data?.totals.open ?? 0 }}</b> {{ t("open") }} ·
        <b class="text-stone-900">{{ money(data?.totals.revenue ?? 0) }}</b>
      </span>
    </div>

    <!-- 2 x 2 boxes: tap a box to open that branch -->
    <div class="grid grid-cols-2 gap-3">
      <button
        v-for="b in data?.branches ?? []"
        :key="b.id"
        type="button"
        class="ds-card flex min-h-36 flex-col items-start gap-2 p-3 text-start transition active:scale-[0.99] hover:border-rose-300"
        @click="openBranch(b.isHead ? null : b.id, `/dashboard/appointments?range=${period === 'today' ? 'today' : 'upcoming'}`)"
      >
        <span class="flex w-full items-start justify-between gap-2">
          <span class="line-clamp-2 text-[14px] font-semibold leading-5 text-stone-900">{{ b.name }}</span>
          <ArrowRight :size="16" class="mt-0.5 shrink-0 text-stone-400 rtl:rotate-180" />
        </span>
        <span v-if="b.isHead" class="ds-tag">{{ t("Head office") }}</span>
        <span class="mt-auto text-3xl font-bold tabular-nums text-stone-900">{{ b.total }}</span>
        <span class="text-[12px] text-stone-500">
          {{ t("orders") }} · <b class="text-emerald-700">{{ b.completed }}</b> {{ t("done") }} · <b class="text-amber-700">{{ b.open }}</b> {{ t("open") }}
        </span>
      </button>
      <button
        type="button"
        class="grid min-h-36 place-items-center rounded-lg border-2 border-dashed border-stone-300 p-3 text-[13px] font-semibold text-stone-500 hover:border-rose-400 hover:text-rose-700"
        @click="showAdd = true"
      >
        <span class="grid justify-items-center gap-1"><Plus :size="20" /> {{ t("Add branch") }}</span>
      </button>
    </div>

    <!-- Add branch -->
    <div v-if="showAdd" class="m-sheet fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4" @click.self="showAdd = false">
      <form class="m-sheet-panel w-full max-w-md space-y-4 rounded-xl bg-white p-5 shadow-2xl" @submit.prevent="addBranch">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold">{{ t("Add branch") }}</h3>
          <button type="button" class="ui-btn ui-btn-ghost ui-btn-icon" :aria-label="t('Close')" @click="showAdd = false"><X :size="18" /></button>
        </div>
        <p class="text-[13px] text-stone-600">{{ t("The branch gets the head office's services, working hours and settings. Online booking stays off.") }}</p>
        <div>
          <label for="branch-name" class="ds-label">{{ t("Branch name") }}</label>
          <input id="branch-name" v-model="newName" type="text" maxlength="120" :placeholder="t('e.g. Lee Lee Pets – Al Khor')" class="w-full px-3" />
        </div>
        <div>
          <label for="branch-city" class="ds-label">{{ t("Area / city (optional)") }}</label>
          <input id="branch-city" v-model="newCity" type="text" maxlength="80" class="w-full px-3" />
        </div>
        <p v-if="addError" class="text-[13px] font-medium text-red-700">{{ addError }}</p>
        <div class="m-sheet-actions flex justify-end gap-2">
          <button type="button" class="ui-btn ui-btn-secondary" @click="showAdd = false">{{ t("Cancel") }}</button>
          <button type="submit" class="ui-btn ui-btn-primary" :disabled="adding">
            <Loader2 v-if="adding" :size="16" class="animate-spin" />
            <span>{{ t("Add branch") }}</span>
          </button>
        </div>
      </form>
    </div>
  </section>
</template>
