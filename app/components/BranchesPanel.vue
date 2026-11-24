<script setup lang="ts">
// Settings > Branches (head office only): the branches, and deleting one.
// Deleting asks for the password again and removes everything in the branch.
import { Loader2, AlertCircle, Trash2, Store, X, Eye, EyeOff, Plus } from "lucide-vue-next";
const { t } = useT();

interface Branch { id: string; name: string; city: string | null; appointments: number; customers: number }

const loading = ref(true);
const loadError = ref("");
const branches = ref<Branch[]>([]);

const load = async () => {
  loading.value = true;
  loadError.value = "";
  try {
    const r = await $fetch<{ branches: Branch[] }>("/api/branches");
    branches.value = r.branches;
  } catch (e: any) {
    loadError.value = e?.data?.statusMessage ?? t("Could not load the branches.");
  } finally {
    loading.value = false;
  }
};
onMounted(load);

const target = ref<Branch | null>(null);
const password = ref("");
const showPassword = ref(false);
const busy = ref(false);
const error = ref("");
const done = ref("");

const askDelete = (b: Branch) => {
  target.value = b;
  password.value = "";
  error.value = "";
  done.value = "";
};
const close = () => {
  if (!busy.value) target.value = null;
};

const confirmDelete = async () => {
  if (!target.value) return;
  if (!password.value) {
    error.value = t("Enter your password.");
    return;
  }
  busy.value = true;
  error.value = "";
  try {
    const name = target.value.name;
    await $fetch(`/api/branches/${target.value.id}`, { method: "DELETE", body: { password: password.value } });
    // working inside the deleted branch on this device? go back to the head office
    if (getSelectedBranch() === target.value.id) clearSelectedBranch();
    target.value = null;
    done.value = t("{name} was deleted.", { name });
    await load();
  } catch (e: any) {
    error.value = e?.data?.statusMessage ?? t("Could not delete the branch.");
    password.value = "";
  } finally {
    busy.value = false;
  }
};
</script>

<template>
  <div class="space-y-4">
    <p v-if="done" class="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-[13px] text-emerald-800">{{ done }}</p>

    <div v-if="loading" class="space-y-2">
      <div v-for="i in 3" :key="i" class="h-14 animate-pulse rounded-md bg-stone-100"></div>
    </div>
    <p v-else-if="loadError" class="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-[13px] text-red-700">
      <AlertCircle :size="16" /> {{ loadError }}
    </p>
    <template v-else>
      <ul v-if="branches.length" class="divide-y divide-stone-200 rounded-lg border border-stone-200">
        <li v-for="b in branches" :key="b.id" class="flex items-center gap-3 px-3 py-3">
          <span class="grid size-9 shrink-0 place-items-center rounded-lg bg-stone-100 text-stone-600"><Store :size="18" /></span>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-semibold text-stone-900">{{ b.name }}</span>
            <span class="block truncate text-xs text-stone-500">
              {{ b.city ? `${b.city} · ` : "" }}{{ t("{a} appointments · {c} customers", { a: b.appointments, c: b.customers }) }}
            </span>
          </span>
          <button type="button" class="ui-btn ui-btn-ghost ui-btn-sm !text-red-700" @click="askDelete(b)">
            <Trash2 :size="15" /> <span class="hidden sm:inline">{{ t("Delete") }}</span>
          </button>
        </li>
      </ul>
      <p v-else class="text-[13px] text-stone-500">{{ t("No branches yet.") }}</p>
      <NuxtLink to="/dashboard" class="inline-flex items-center gap-1.5 text-[13px] font-semibold text-rose-700 hover:underline">
        <Plus :size="15" /> {{ t("Add a branch from Home") }}
      </NuxtLink>
    </template>

    <!-- Delete: password again -->
    <div v-if="target" class="m-sheet fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4" @click.self="close">
      <form class="m-sheet-panel w-full max-w-md space-y-4 rounded-2xl bg-white p-5 shadow-2xl" @submit.prevent="confirmDelete">
        <div class="flex items-start justify-between gap-3">
          <h3 class="text-lg font-bold text-stone-900">{{ t("Delete {name}?", { name: target.name }) }}</h3>
          <button type="button" class="m-sheet-close rounded-lg p-1.5 text-stone-400 hover:bg-stone-100" :aria-label="t('Close')" @click="close"><X :size="18" /></button>
        </div>
        <div class="rounded-md border border-red-200 bg-red-50 p-3 text-[13px] text-red-800">
          <p class="font-semibold">{{ t("This cannot be undone.") }}</p>
          <p class="mt-1">
            {{ t("Everything in this branch is deleted: {a} appointments, {c} customers, its services, hours and team access. Head-office drivers are kept.", { a: target.appointments, c: target.customers }) }}
          </p>
        </div>
        <div>
          <label for="del-branch-pw" class="ds-label">{{ t("Your password") }}</label>
          <div class="relative">
            <input
              id="del-branch-pw"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              class="w-full ps-3 pe-11"
            />
            <button
              type="button"
              class="absolute end-1 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded text-stone-500"
              :aria-label="showPassword ? t('Hide password') : t('Show password')"
              @click="showPassword = !showPassword"
            >
              <EyeOff v-if="showPassword" :size="16" /><Eye v-else :size="16" />
            </button>
          </div>
          <p v-if="error" class="mt-2 flex items-center gap-1.5 text-[13px] font-medium text-red-700"><AlertCircle :size="15" /> {{ error }}</p>
        </div>
        <div class="m-sheet-actions flex justify-end gap-2 border-t border-stone-100 pt-3">
          <button type="button" class="ui-btn ui-btn-secondary" :disabled="busy" @click="close">{{ t("Cancel") }}</button>
          <button type="submit" class="ui-btn ui-btn-primary !border-red-600 !bg-red-600 hover:!bg-red-700" :disabled="busy">
            <Loader2 v-if="busy" :size="16" class="animate-spin" />
            <Trash2 v-else :size="16" />
            <span>{{ t("Delete branch") }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
