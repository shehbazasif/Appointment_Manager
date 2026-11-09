<script setup lang="ts">
import {
  CalendarDays,
  Users,
  ChevronRight,
  Check,
  MapPin,
  Clock,
  BellRing,
  Phone,
} from "lucide-vue-next";

/**
 * Hero product mockup: the real dashboard ("Today") inside a laptop frame
 * and the public booking page inside a phone frame. Pure HTML/CSS.
 */
const today = [
  { time: "09:30", name: "Eleni Papadaki", service: "Cut & blow-dry", staff: "Maria", status: "Checked in", tone: "bg-blue-50 text-blue-700" },
  { time: "10:15", name: "Omar Al-Sayed", service: "Beard trim", staff: "Nikos", status: "Confirmed", tone: "bg-emerald-50 text-emerald-700" },
  { time: "11:00", name: "Sophie Laurent", service: "Gel manicure", staff: "Anna", status: "Confirmed", tone: "bg-emerald-50 text-emerald-700" },
  { time: "12:30", name: "Giorgos Nikolaou", service: "Colour & gloss", staff: "Maria", status: "Pending", tone: "bg-amber-50 text-amber-700" },
];
const slots = ["10:00", "10:30", "11:30", "12:00", "14:00", "15:30"];
</script>

<template>
  <div class="relative mx-auto w-full max-w-[640px] select-none sm:mb-16" aria-hidden="true">
    <!-- Laptop (tablet & desktop only — too cramped on a phone) -->
    <div class="float-b relative hidden pr-[24%] sm:block">
      <div class="rounded-t-[1.1rem] border border-stone-300 bg-stone-900 p-2 shadow-2xl shadow-stone-900/25 sm:p-2.5">
        <div class="overflow-hidden rounded-lg bg-[#fbfaf8]">
          <!-- app top bar -->
          <div class="flex items-center justify-between border-b border-stone-200 bg-white px-3 py-2">
            <div class="flex items-center gap-1.5">
              <span class="grid size-5 place-items-center rounded-md bg-rose-600 text-white"><CalendarDays :size="11" /></span>
              <span class="text-[10px] font-bold text-stone-900">Studio Maria</span>
            </div>
            <div class="flex gap-1">
              <span class="h-1.5 w-8 rounded-full bg-stone-200" />
              <span class="h-1.5 w-5 rounded-full bg-stone-200" />
            </div>
          </div>
          <div class="grid grid-cols-[1fr] gap-2 p-3 sm:grid-cols-[1.6fr_1fr]">
            <!-- Today's schedule -->
            <div class="rounded-lg border border-stone-200 bg-white p-2.5">
              <div class="flex items-center justify-between">
                <p class="text-[10px] font-bold text-stone-900">Today's schedule</p>
                <span class="rounded-full bg-rose-50 px-1.5 py-0.5 text-[8px] font-bold text-rose-600">4 bookings</span>
              </div>
              <ul class="mt-2 space-y-1.5">
                <li v-for="a in today" :key="a.time" class="flex items-center gap-2 rounded-md border border-stone-100 px-2 py-1.5">
                  <span class="w-7 text-[9px] font-bold tabular-nums text-stone-500">{{ a.time }}</span>
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-[9px] font-bold text-stone-900">{{ a.name }}</span>
                    <span class="block truncate text-[8px] text-stone-500">{{ a.service }} · {{ a.staff }}</span>
                  </span>
                  <span class="shrink-0 rounded px-1 py-0.5 text-[7px] font-bold" :class="a.tone">{{ a.status }}</span>
                </li>
              </ul>
            </div>
            <!-- stats -->
            <div class="hidden gap-2 sm:grid">
              <div class="rounded-lg border border-stone-200 bg-white p-2.5">
                <p class="text-[8px] font-bold uppercase tracking-wider text-stone-400">Today</p>
                <p class="text-lg font-bold text-stone-900">4</p>
                <p class="text-[8px] text-emerald-600">+2 booked online</p>
              </div>
              <div class="rounded-lg border border-stone-200 bg-white p-2.5">
                <p class="text-[8px] font-bold uppercase tracking-wider text-stone-400">Upcoming</p>
                <p class="text-lg font-bold text-stone-900">18</p>
                <p class="text-[8px] text-stone-500">next 7 days</p>
              </div>
              <div class="rounded-lg border border-stone-200 bg-white p-2.5">
                <p class="flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider text-stone-400"><Users :size="9" /> Team in</p>
                <div class="mt-1 flex -space-x-1.5">
                  <span v-for="c in ['bg-rose-200', 'bg-amber-200', 'bg-teal-200']" :key="c" class="size-5 rounded-full border-2 border-white" :class="c" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="mx-auto h-3 w-[104%] -translate-x-[2%] rounded-b-2xl bg-gradient-to-b from-stone-300 to-stone-400 shadow-lg" />
    </div>

    <!-- Phone: public booking page (real phone proportions 9:19.5) -->
    <div class="float-a relative mx-auto w-[60%] max-w-[230px] sm:absolute sm:-bottom-16 sm:right-0 sm:mx-0 sm:w-[32%] sm:min-w-[140px] sm:max-w-[178px]">
      <div class="rounded-[2.2rem] bg-stone-900 p-[5px] shadow-2xl shadow-stone-900/35 ring-1 ring-stone-700">
        <div class="relative flex aspect-[9/19.5] flex-col overflow-hidden rounded-[1.9rem] bg-white">
          <!-- status bar + Dynamic Island -->
          <div class="relative flex h-7 shrink-0 items-center justify-between bg-rose-600 px-4 text-[8px] font-bold text-white">
            <span>9:41</span>
            <span class="absolute left-1/2 top-1.5 h-[13px] w-[46px] -translate-x-1/2 rounded-full bg-stone-900" />
            <span class="flex items-center gap-[3px]">
              <span class="flex items-end gap-[1px]"><span class="h-1 w-[2px] rounded-sm bg-white" /><span class="h-1.5 w-[2px] rounded-sm bg-white" /><span class="h-2 w-[2px] rounded-sm bg-white" /></span>
              <span class="h-[7px] w-3.5 rounded-[2px] border border-white/80 p-[1px]"><span class="block h-full w-2/3 rounded-[1px] bg-white" /></span>
            </span>
          </div>
          <!-- business header -->
          <div class="shrink-0 bg-gradient-to-b from-rose-600 to-rose-700 px-3 pb-3 pt-1.5 text-white">
            <div class="flex items-center gap-1.5">
              <span class="grid size-5 place-items-center rounded-md bg-white/20"><CalendarDays :size="10" /></span>
              <span>
                <span class="block text-[9px] font-bold leading-tight">Studio Maria</span>
                <span class="flex items-center gap-0.5 text-[7px] text-rose-100"><MapPin :size="7" /> Athens</span>
              </span>
            </div>
          </div>
          <!-- content -->
          <div class="flex flex-1 flex-col gap-1.5 px-2.5 pt-2.5">
            <p class="text-[7px] font-bold uppercase tracking-wider text-stone-400">1 · Service</p>
            <div class="flex items-center justify-between rounded-lg border-[1.5px] border-rose-500 bg-rose-50 px-2 py-1.5">
              <span>
                <span class="block text-[8px] font-bold text-stone-900">Cut & blow-dry</span>
                <span class="flex items-center gap-0.5 text-[7px] text-stone-500"><Clock :size="7" /> 45 min</span>
              </span>
              <span class="grid size-3.5 place-items-center rounded-full bg-rose-600 text-white"><Check :size="8" /></span>
            </div>
            <div class="flex items-center justify-between rounded-lg border border-stone-200 px-2 py-1.5">
              <span class="text-[8px] font-semibold text-stone-700">Gel manicure</span>
              <ChevronRight :size="9" class="text-stone-400" />
            </div>
            <p class="pt-1 text-[7px] font-bold uppercase tracking-wider text-stone-400">2 · Thu 14 Nov</p>
            <div class="grid grid-cols-3 gap-1">
              <span
                v-for="(s, i) in slots"
                :key="s"
                class="rounded-md border py-1 text-center text-[7px] font-bold"
                :class="i === 2 ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 text-stone-700'"
              >{{ s }}</span>
            </div>
            <div class="mt-auto rounded-lg bg-stone-900 py-2 text-center text-[8px] font-bold text-white">Confirm 11:30</div>
          </div>
          <!-- home indicator -->
          <div class="flex h-4 shrink-0 items-center justify-center"><span class="h-[3px] w-12 rounded-full bg-stone-900/80" /></div>
        </div>
      </div>
    </div>

    <!-- Phone-only floating cards around the centred phone -->
    <div class="float-b absolute left-0 top-[42%] z-10 w-[44%] max-w-[170px] rounded-2xl border border-stone-200 bg-white/95 p-3 shadow-xl shadow-stone-900/10 backdrop-blur sm:hidden" style="animation-delay: -2s">
      <p class="text-[10px] font-bold uppercase tracking-wider text-stone-400">Today</p>
      <p class="flex items-baseline gap-1 text-xl font-bold text-stone-900">4 <span class="text-[11px] font-semibold text-emerald-600">bookings</span></p>
      <div class="mt-2 space-y-1.5">
        <div v-for="a in today.slice(0, 2)" :key="a.time" class="flex items-center gap-1.5">
          <span class="text-[10px] font-bold tabular-nums text-stone-500">{{ a.time }}</span>
          <span class="truncate text-[10px] font-semibold text-stone-800">{{ a.name.split(" ")[0] }}</span>
        </div>
      </div>
    </div>
    <div class="float-a absolute bottom-[7%] right-0 z-10 flex items-center gap-2 rounded-2xl border border-stone-200 bg-white/95 px-3 py-2 shadow-xl shadow-stone-900/10 backdrop-blur sm:hidden" style="animation-delay: -3s">
      <span class="grid size-8 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><BellRing :size="15" /></span>
      <span>
        <span class="block text-[11px] font-bold text-stone-900">Reminder sent ✓</span>
        <span class="block text-[10px] text-stone-500">Tomorrow 11:30</span>
      </span>
    </div>

    <!-- Floating notification -->
    <div class="float-a absolute -bottom-12 left-2 hidden items-center gap-2 rounded-2xl border border-stone-200 bg-white/95 px-3 py-2 shadow-xl shadow-stone-900/10 backdrop-blur sm:left-4 sm:flex" style="animation-delay: -2s">
      <span class="grid size-8 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><BellRing :size="15" /></span>
      <span>
        <span class="block text-[11px] font-bold text-stone-900">New booking · 11:30</span>
        <span class="block text-[10px] text-stone-500">Cut & blow-dry with Maria</span>
      </span>
    </div>
    <div class="float-b absolute -top-5 left-[30%] hidden items-center gap-2 rounded-2xl border border-stone-200 bg-white/95 px-3 py-2 shadow-xl shadow-stone-900/10 backdrop-blur md:flex" style="animation-delay: -3s">
      <span class="grid size-7 place-items-center rounded-lg bg-rose-50 text-rose-600"><Phone :size="13" /></span>
      <span class="text-[11px] font-bold text-stone-900">Reminder sent ✓</span>
    </div>
  </div>
</template>
