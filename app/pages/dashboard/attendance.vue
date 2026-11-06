<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from "vue";
import { ScanLine, QrCode, CalendarClock, Clock, Camera, Download, Save, CheckCircle2, AlertCircle } from "lucide-vue-next";
import jsQR from "jsqr";
import QRCode from "qrcode";

definePageMeta({ layout: "dashboard" });

type Tab = "scan" | "log" | "schedule" | "badges";
const tab = ref<Tab>("scan");
const tabs: { id: Tab; name: string; icon: any }[] = [
  { id: "scan", name: "Scan", icon: ScanLine },
  { id: "log", name: "Today", icon: Clock },
  { id: "schedule", name: "Duty hours", icon: CalendarClock },
  { id: "badges", name: "QR badges", icon: QrCode },
];

const tz = ref("");
const fmtTime = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: tz.value || undefined, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));

/* ---------------------------------------------------------------- scanning */
const videoEl = ref<HTMLVideoElement | null>(null);
const scanning = ref(false);
const camError = ref("");
const scanMsg = ref<{ ok: boolean; text: string } | null>(null);
let stream: MediaStream | null = null;
let raf = 0;
let canvasEl: HTMLCanvasElement | null = null;
let lastCode = "";
let lastAt = 0;

const stopScan = () => {
  cancelAnimationFrame(raf);
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
  scanning.value = false;
};

const submitScan = async (token: string) => {
  try {
    const r = await $fetch<{ action: string; staffName: string; at: string }>("/api/attendance/scan", {
      method: "POST",
      body: { token },
    });
    const when = fmtTime(r.at);
    scanMsg.value = {
      ok: r.action !== "IGNORED",
      text:
        r.action === "CHECK_IN" ? `${r.staffName} checked in at ${when}`
        : r.action === "CHECK_OUT" ? `${r.staffName} checked out at ${when}`
        : `${r.staffName} was just scanned (${when})`,
    };
    loadLog();
  } catch (err: any) {
    scanMsg.value = { ok: false, text: err?.data?.statusMessage ?? "Scan failed. Try again." };
  }
};

const tick = () => {
  const v = videoEl.value;
  if (!v || !scanning.value) return;
  if (v.readyState === v.HAVE_ENOUGH_DATA && v.videoWidth) {
    const w = 480;
    const h = Math.round((w * v.videoHeight) / v.videoWidth);
    canvasEl ??= document.createElement("canvas");
    canvasEl.width = w;
    canvasEl.height = h;
    const ctx = canvasEl.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(v, 0, 0, w, h);
    const img = ctx.getImageData(0, 0, w, h);
    const code = jsQR(img.data, w, h, { inversionAttempts: "dontInvert" });
    if (code?.data && (code.data !== lastCode || Date.now() - lastAt > 5000)) {
      lastCode = code.data;
      lastAt = Date.now();
      submitScan(code.data);
    }
  }
  raf = requestAnimationFrame(tick);
};

const startScan = async () => {
  camError.value = "";
  scanMsg.value = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
  } catch {
    camError.value = "Camera access is needed to scan QR codes. Please allow the camera and try again.";
    return;
  }
  scanning.value = true;
  await nextTick();
  if (videoEl.value) {
    videoEl.value.srcObject = stream;
    await videoEl.value.play();
    tick();
  }
};

/* --------------------------------------------------------------------- log */
interface LogRecord { id: string; staffName: string; role: string; checkInAt: string; checkOutAt: string | null }
const pad = (n: number) => String(n).padStart(2, "0");
const now = new Date();
const logDate = ref(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`);
const records = ref<LogRecord[]>([]);
const logError = ref("");

const loadLog = async () => {
  try {
    const r = await $fetch<{ timezone: string; records: LogRecord[] }>("/api/attendance", { query: { date: logDate.value } });
    tz.value = r.timezone;
    records.value = r.records;
    logError.value = "";
  } catch (err: any) {
    logError.value = err?.data?.statusMessage ?? "Could not load attendance.";
  }
};
watch(logDate, loadLog);

const duration = (r: LogRecord) => {
  if (!r.checkOutAt) return "On duty";
  const mins = Math.round((new Date(r.checkOutAt).getTime() - new Date(r.checkInAt).getTime()) / 60000);
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

/* ---------------------------------------------------------------- schedule */
interface StaffRow { id: string; name: string; role: string; active: boolean }
interface Day { dayOfWeek: number; isOff: boolean; startTime: string; endTime: string }
const staffList = ref<StaffRow[]>([]);
const edits = ref<Record<string, Day[]>>({});
const custom = ref<Record<string, boolean>>({});
const openId = ref<string | null>(null);
const savingId = ref<string | null>(null);
const schedMsg = ref("");
const dayOrder = [1, 2, 3, 4, 5, 6, 0];
const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const loadSchedules = async () => {
  const [staff, rows] = await Promise.all([
    $fetch<StaffRow[]>("/api/staff"),
    $fetch<{ staffId: string; dayOfWeek: number; isOff: boolean; startTime: string; endTime: string }[]>("/api/staff-schedules").catch(() => []),
  ]);
  staffList.value = staff.filter((s) => s.active);
  for (const s of staffList.value) {
    const mine = rows.filter((r) => r.staffId === s.id);
    custom.value[s.id] = mine.length > 0;
    edits.value[s.id] = dayOrder.map((d) => {
      const found = mine.find((r) => r.dayOfWeek === d);
      return found
        ? { dayOfWeek: d, isOff: found.isOff, startTime: found.startTime, endTime: found.endTime }
        : { dayOfWeek: d, isOff: mine.length > 0, startTime: "09:00", endTime: "17:00" };
    });
  }
};

const copyFirst = (id: string) => {
  const days = edits.value[id]!;
  const first = days.find((d) => !d.isOff) ?? days[0]!;
  days.forEach((d) => { if (!d.isOff) { d.startTime = first.startTime; d.endTime = first.endTime; } });
};

const saveSchedule = async (id: string, clear = false) => {
  savingId.value = id;
  schedMsg.value = "";
  try {
    await $fetch(`/api/staff/${id}/schedule`, { method: "PUT", body: { days: clear ? [] : edits.value[id] } });
    schedMsg.value = clear ? "Now follows the business hours." : "Duty hours saved.";
    await loadSchedules();
  } catch (err: any) {
    schedMsg.value = err?.data?.statusMessage ?? "Could not save.";
  } finally {
    savingId.value = null;
  }
};

/* ------------------------------------------------------------------ badges */
interface Badge { id: string; name: string; role: string; token: string; qr?: string }
const badges = ref<Badge[]>([]);
const badgeError = ref("");
const loadBadges = async () => {
  try {
    const list = await $fetch<Badge[]>("/api/attendance/badges");
    for (const b of list) b.qr = await QRCode.toDataURL(b.token, { width: 280, margin: 1, errorCorrectionLevel: "M" });
    badges.value = list;
    badgeError.value = "";
  } catch (err: any) {
    badgeError.value = err?.data?.statusMessage ?? "Could not load badges.";
  }
};

watch(tab, (t) => {
  if (t !== "scan") stopScan();
  if (t === "schedule" && !staffList.value.length) loadSchedules();
  if (t === "badges" && !badges.value.length) loadBadges();
});

onMounted(loadLog);
onBeforeUnmount(stopScan);
const hasStaff = computed(() => staffList.value.length > 0);
</script>

<template>
  <div class="space-y-6 pb-16">
    <div>
      <p class="text-xs font-bold uppercase tracking-wider text-rose-600">Team &amp; Providers</p>
      <h1 class="font-display text-3xl font-bold tracking-tight text-stone-900">Attendance &amp; Duty</h1>
    </div>

    <div class="flex gap-1 overflow-x-auto rounded-2xl border border-stone-200 bg-white p-1.5 shadow-sm">
      <button
        v-for="t in tabs"
        :key="t.id"
        type="button"
        @click="tab = t.id"
        :class="[tab === t.id ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100', 'flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition']"
      >
        <component :is="t.icon" :size="16" /><span>{{ t.name }}</span>
      </button>
    </div>

    <!-- SCAN -->
    <section v-if="tab === 'scan'" class="space-y-4 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
      <p class="text-sm text-stone-600">
        Keep this screen open on a phone or tablet at your entrance. When a staff member shows their QR badge to the
        camera, their <b>check-in</b> is saved; the next scan is their <b>check-out</b>.
      </p>
      <div v-if="scanning" class="overflow-hidden rounded-2xl bg-stone-900">
        <video ref="videoEl" playsinline muted class="mx-auto aspect-[4/3] w-full max-w-md object-cover"></video>
      </div>
      <div v-if="scanMsg" :class="[scanMsg.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-700', 'flex items-start gap-2 rounded-xl p-3 text-sm font-semibold']">
        <CheckCircle2 v-if="scanMsg.ok" :size="18" class="mt-0.5 shrink-0" /><AlertCircle v-else :size="18" class="mt-0.5 shrink-0" />
        <span>{{ scanMsg.text }}</span>
      </div>
      <div v-if="camError" class="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{{ camError }}</div>
      <button v-if="!scanning" type="button" @click="startScan" class="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-3 text-sm font-bold text-white hover:bg-rose-700">
        <Camera :size="18" /><span>Start scanning</span>
      </button>
      <button v-else type="button" @click="stopScan" class="rounded-xl border border-stone-200 px-5 py-3 text-sm font-bold text-stone-700 hover:bg-stone-50">Stop camera</button>
    </section>

    <!-- LOG -->
    <section v-if="tab === 'log'" class="space-y-4 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
      <div class="flex items-center gap-3">
        <label for="logdate" class="text-xs font-bold text-stone-600">Date</label>
        <input id="logdate" v-model="logDate" type="date" class="rounded-xl border border-stone-200 px-3 py-2 text-sm" />
      </div>
      <p v-if="logError" class="text-sm text-rose-600">{{ logError }}</p>
      <p v-else-if="!records.length" class="text-sm text-stone-500">No attendance recorded for this day.</p>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="text-xs uppercase text-stone-400">
            <tr><th class="py-2 pr-4">Staff</th><th class="py-2 pr-4">In</th><th class="py-2 pr-4">Out</th><th class="py-2">Time</th></tr>
          </thead>
          <tbody>
            <tr v-for="r in records" :key="r.id" class="border-t border-stone-100">
              <td class="py-3 pr-4"><div class="font-bold text-stone-900">{{ r.staffName }}</div><div class="text-xs text-stone-500">{{ r.role }}</div></td>
              <td class="py-3 pr-4 font-semibold">{{ fmtTime(r.checkInAt) }}</td>
              <td class="py-3 pr-4">{{ r.checkOutAt ? fmtTime(r.checkOutAt) : "—" }}</td>
              <td class="py-3"><span :class="r.checkOutAt ? 'text-stone-600' : 'rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700'">{{ duration(r) }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- SCHEDULE -->
    <section v-if="tab === 'schedule'" class="space-y-3">
      <p class="text-sm text-stone-600">
        Set each person's duty hours. Customers can only book a staff member inside these hours. Staff without
        custom hours follow your normal business hours.
      </p>
      <p v-if="schedMsg" class="rounded-xl bg-stone-100 p-3 text-sm font-semibold text-stone-700">{{ schedMsg }}</p>
      <p v-if="!hasStaff" class="text-sm text-stone-500">No active staff yet.</p>
      <div v-for="s in staffList" :key="s.id" class="rounded-3xl border border-stone-200 bg-white shadow-sm">
        <button type="button" class="flex w-full items-center justify-between px-5 py-4 text-left" @click="openId = openId === s.id ? null : s.id">
          <div><div class="font-bold text-stone-900">{{ s.name }}</div><div class="text-xs text-stone-500">{{ s.role }}</div></div>
          <span :class="custom[s.id] ? 'bg-rose-50 text-rose-700' : 'bg-stone-100 text-stone-500'" class="rounded-full px-3 py-1 text-[11px] font-bold">{{ custom[s.id] ? "Custom hours" : "Business hours" }}</span>
        </button>
        <div v-if="openId === s.id && edits[s.id]" class="space-y-2 border-t border-stone-100 px-5 py-4">
          <div v-for="d in edits[s.id]" :key="d.dayOfWeek" class="flex flex-wrap items-center gap-3">
            <label class="flex w-32 items-center gap-2 text-sm font-semibold text-stone-800">
              <input type="checkbox" :checked="!d.isOff" @change="d.isOff = !($event.target as HTMLInputElement).checked" class="size-4 accent-rose-600" />
              {{ dayNames[d.dayOfWeek] }}
            </label>
            <template v-if="!d.isOff">
              <input v-model="d.startTime" type="time" :aria-label="`${dayNames[d.dayOfWeek]} start`" class="rounded-lg border border-stone-200 px-2 py-1.5 text-sm" />
              <span class="text-stone-400">to</span>
              <input v-model="d.endTime" type="time" :aria-label="`${dayNames[d.dayOfWeek]} end`" class="rounded-lg border border-stone-200 px-2 py-1.5 text-sm" />
            </template>
            <span v-else class="text-xs text-stone-400">Day off</span>
          </div>
          <div class="flex flex-wrap gap-2 pt-3">
            <button type="button" @click="saveSchedule(s.id)" :disabled="savingId === s.id" class="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"><Save :size="14" /><span>{{ savingId === s.id ? "Saving…" : "Save duty hours" }}</span></button>
            <button type="button" @click="copyFirst(s.id)" class="rounded-xl border border-stone-200 px-4 py-2.5 text-xs font-bold text-stone-700 hover:bg-stone-50">Copy first day's hours to all</button>
            <button v-if="custom[s.id]" type="button" @click="saveSchedule(s.id, true)" class="rounded-xl border border-stone-200 px-4 py-2.5 text-xs font-bold text-stone-700 hover:bg-stone-50">Use business hours</button>
          </div>
        </div>
      </div>
    </section>

    <!-- BADGES -->
    <section v-if="tab === 'badges'" class="space-y-3">
      <p class="text-sm text-stone-600">Each staff member has a personal QR badge. Share it with them (or print it) — they show it to the scanner for check-in and check-out.</p>
      <p v-if="badgeError" class="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{{ badgeError }}</p>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div v-for="b in badges" :key="b.id" class="flex flex-col items-center gap-2 rounded-3xl border border-stone-200 bg-white p-5 text-center shadow-sm">
          <img v-if="b.qr" :src="b.qr" :alt="`QR badge for ${b.name}`" class="size-44" />
          <div class="font-bold text-stone-900">{{ b.name }}</div>
          <div class="text-xs text-stone-500">{{ b.role }}</div>
          <a v-if="b.qr" :href="b.qr" :download="`${b.name}-badge.png`" class="mt-1 inline-flex items-center gap-1.5 rounded-xl border border-stone-200 px-3 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50"><Download :size="14" /><span>Download</span></a>
        </div>
      </div>
    </section>
  </div>
</template>
