<script setup lang="ts">
import { ref, computed } from "vue";
import { Upload, FileSpreadsheet, X, CheckCircle2, AlertCircle, Download } from "lucide-vue-next";
import type { ImportKind, ImportPreview } from "~/utils/sheet-import";

const props = defineProps<{ kind: ImportKind }>();
const emit = defineEmits<{ (e: "close"): void; (e: "done"): void }>();

const label = computed(() => (props.kind === "customers" ? "customers" : "staff members"));
const fileName = ref("");
const preview = ref<ImportPreview | null>(null);
const parseError = ref("");
const isImporting = ref(false);
const result = ref<{ inserted: number; skipped: { row: number; reason: string }[] } | null>(null);

const validItems = computed(() => preview.value?.items.filter((i) => !i.errors.length) ?? []);
const badItems = computed(() => preview.value?.items.filter((i) => i.errors.length) ?? []);

const onFile = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  parseError.value = "";
  preview.value = null;
  result.value = null;
  fileName.value = file.name;
  try {
    const rows = await readSheetFile(file);
    preview.value = buildPreview(rows, props.kind);
    if (!preview.value.items.length) parseError.value = "No data rows found under the header.";
  } catch (err: any) {
    parseError.value = err?.message ?? "Could not read this file.";
  }
};

const runImport = async () => {
  if (!validItems.value.length) return;
  isImporting.value = true;
  parseError.value = "";
  try {
    result.value = await $fetch(`/api/${props.kind}/import`, {
      method: "POST",
      body: { rows: validItems.value.map((i) => ({ row: i.row, data: i.data })) },
    });
    emit("done");
  } catch (err: any) {
    parseError.value = err?.data?.statusMessage ?? "Import failed. Nothing was changed for the failed part.";
  } finally {
    isImporting.value = false;
  }
};

const cols = computed(() =>
  props.kind === "customers"
    ? [["firstName", "First"], ["lastName", "Last"], ["email", "Email"], ["phone", "Phone"]]
    : [["name", "Name"], ["role", "Role"], ["email", "Email"], ["phone", "Phone"]],
);
</script>

<template>
  <div class="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-stone-900/50 p-0 sm:p-4" @click.self="emit('close')">
    <div class="flex max-h-[92dvh] w-full max-w-2xl flex-col rounded-t-3xl sm:rounded-3xl border border-stone-200 bg-white shadow-2xl">
      <div class="flex items-center justify-between border-b border-stone-100 px-6 py-4">
        <div class="flex items-center gap-2">
          <FileSpreadsheet :size="20" class="text-rose-600" />
          <h3 class="font-display text-xl font-bold text-stone-900">Import {{ label }} from Excel</h3>
        </div>
        <button type="button" @click="emit('close')" class="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100"><X :size="18" /></button>
      </div>

      <div class="space-y-4 overflow-y-auto px-6 py-5">
        <template v-if="!result">
          <p class="text-sm text-stone-600">
            Choose an <b>.xlsx</b> or <b>.csv</b> file. We only take the useful columns
            ({{ kind === "customers" ? "name, email, phone, notes" : "name, email, phone, role, status" }})
            and skip everything else. Rows already in your system are skipped.
          </p>
          <div class="flex flex-wrap items-center gap-3">
            <label class="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-stone-800">
              <Upload :size="14" /><span>Choose file</span>
              <input type="file" accept=".xlsx,.csv,text/csv" class="hidden" @change="onFile" />
            </label>
            <button type="button" @click="downloadTemplate(kind)" class="inline-flex items-center gap-2 rounded-xl border border-stone-200 px-4 py-2.5 text-xs font-bold text-stone-700 hover:bg-stone-50">
              <Download :size="14" /><span>Download template</span>
            </button>
            <span v-if="fileName" class="truncate text-xs text-stone-500">{{ fileName }}</span>
          </div>

          <div v-if="parseError" class="flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
            <AlertCircle :size="16" class="mt-0.5 shrink-0" /><span>{{ parseError }}</span>
          </div>

          <template v-if="preview && preview.items.length">
            <div class="rounded-xl bg-stone-50 p-3 text-xs text-stone-600 space-y-1">
              <div><b class="text-stone-900">Columns used:</b> {{ preview.mapped.join(", ") }}</div>
              <div v-if="preview.ignored.length"><b class="text-stone-900">Skipped columns:</b> {{ preview.ignored.join(", ") }}</div>
              <div>
                <b class="text-emerald-700">{{ validItems.length }} ready</b>
                <span v-if="badItems.length"> · <b class="text-rose-600">{{ badItems.length }} with problems (will be skipped)</b></span>
              </div>
            </div>

            <div class="overflow-x-auto rounded-xl border border-stone-200">
              <table class="w-full text-left text-xs">
                <thead class="bg-stone-50 text-stone-500">
                  <tr><th class="px-3 py-2">Row</th><th v-for="c in cols" :key="c[0]" class="px-3 py-2">{{ c[1] }}</th><th class="px-3 py-2">Check</th></tr>
                </thead>
                <tbody>
                  <tr v-for="item in preview.items.slice(0, 8)" :key="item.row" class="border-t border-stone-100">
                    <td class="px-3 py-2 text-stone-400">{{ item.row }}</td>
                    <td v-for="c in cols" :key="c[0]" class="px-3 py-2">{{ item.data[c[0]!] || "—" }}</td>
                    <td class="px-3 py-2" :class="item.errors.length ? 'text-rose-600' : 'text-emerald-700'">{{ item.errors.length ? item.errors.join(", ") : "OK" }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-if="preview.items.length > 8" class="text-xs text-stone-400">Showing the first 8 of {{ preview.items.length }} rows.</p>
          </template>
        </template>

        <template v-else>
          <div class="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-emerald-800">
            <CheckCircle2 :size="20" /><b>{{ result.inserted }} {{ label }} imported.</b>
          </div>
          <div v-if="result.skipped.length" class="rounded-xl bg-stone-50 p-3 text-xs text-stone-600">
            <b class="text-stone-900">{{ result.skipped.length }} skipped:</b>
            <ul class="mt-1 list-disc pl-5">
              <li v-for="s in result.skipped.slice(0, 10)" :key="s.row">Row {{ s.row }}: {{ s.reason }}</li>
            </ul>
          </div>
        </template>
      </div>

      <div class="flex justify-end gap-2 border-t border-stone-100 px-6 py-4">
        <button type="button" @click="emit('close')" class="rounded-xl border border-stone-200 px-4 py-2.5 text-xs font-bold text-stone-700 hover:bg-stone-50">{{ result ? "Close" : "Cancel" }}</button>
        <button v-if="!result" type="button" :disabled="!validItems.length || isImporting" @click="runImport" class="rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-40">
          {{ isImporting ? "Importing…" : `Import ${validItems.length} ${label}` }}
        </button>
      </div>
    </div>
  </div>
</template>
