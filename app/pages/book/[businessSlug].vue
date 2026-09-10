<script setup lang="ts">
import {
  CalendarDays,
  Check,
  ChevronLeft,
  Clock3,
  MapPin,
} from "lucide-vue-next";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import { demoBusiness, demoServices } from "#shared/data/demo";

const selectedService = ref(demoServices[0]!);
const selectedDate = ref("Wed, 9 Sep");
const selectedTime = ref("10:30");
const booked = ref(false);
const shareBooking = () =>
  window.open(
    `https://wa.me/?text=${encodeURIComponent(`Book an appointment at ${demoBusiness.name}: ${window.location.href}`)}`,
    "_blank",
  );
const slots = [
  "09:00",
  "09:30",
  "10:30",
  "11:00",
  "12:30",
  "14:00",
  "15:30",
  "16:00",
];
</script>

<template>
  <div
    class="min-h-screen bg-[radial-gradient(circle_at_80%_0%,#f8eee9_0,transparent_32rem),#fbfaf8]"
  >
    <main class="mx-auto max-w-280 px-5 pb-16 pt-8">
      <NuxtLink
        to="/"
        class="inline-flex items-center gap-1 text-xs text-stone-500"
        ><ChevronLeft :size="16" /> Back to studio dashboard</NuxtLink
      >
      <section
        v-if="!booked"
        class="grid gap-8 pt-12 lg:grid-cols-[.8fr_1.2fr] lg:gap-16 lg:pt-16"
      >
        <div class="pt-0 lg:pt-8">
          <p class="eyebrow">Book an appointment</p>
          <h1
            class="font-display text-5xl leading-tight tracking-tight lg:text-6xl"
          >
            {{ demoBusiness.name }}
          </h1>
          <p class="mt-5 max-w-sm text-sm leading-7 text-stone-500">
            Choose a service and a time that works for you. We look forward to
            seeing you.
          </p>
          <div class="mt-6 grid gap-3 text-xs text-stone-500">
            <span class="flex items-center gap-2"
              ><MapPin :size="16" /> {{ demoBusiness.city }},
              {{ demoBusiness.country }}</span
            ><span class="flex items-center gap-2"
              ><Clock3 :size="16" /> Open today until 19:00</span
            >
          </div>
        </div>
        <section class="surface p-5 shadow-xl shadow-stone-900/5 lg:p-7">
          <div class="flex gap-3">
            <span
              class="grid size-6 shrink-0 place-items-center rounded-full bg-ink text-[11px] font-bold text-white"
              >1</span
            >
            <div>
              <h2 class="font-semibold">Choose a service</h2>
              <p class="mt-1 text-xs text-stone-500">
                Select the appointment you would like to book.
              </p>
            </div>
          </div>
          <div class="mt-5 grid gap-2">
            <button
              v-for="service in demoServices"
              :key="service.id"
              type="button"
              :class="[
                'flex items-center gap-3 rounded-lg border p-3 text-left transition',
                selectedService.id === service.id
                  ? 'border-rose ring-1 ring-rose'
                  : 'border-stone-200',
              ]"
              @click="selectedService = service"
            >
              <span
                class="size-2.5 shrink-0 rounded-full"
                :style="{ backgroundColor: service.accent }"
              ></span
              ><span class="grid flex-1 gap-1"
                ><strong class="text-sm">{{ service.name }}</strong
                ><small class="text-[11px] text-stone-500"
                  >{{ service.durationMinutes }} min</small
                ></span
              ><b class="text-xs font-semibold"
                >{{ (service.priceCents / 100).toFixed(2) }} €</b
              >
            </button>
          </div>
          <div class="mt-7 flex gap-3">
            <span
              class="grid size-6 shrink-0 place-items-center rounded-full bg-ink text-[11px] font-bold text-white"
              >2</span
            >
            <div>
              <h2 class="font-semibold">Choose a time</h2>
              <p class="mt-1 text-xs text-stone-500">
                {{ selectedService.name }} ·
                {{ selectedService.durationMinutes }} minutes
              </p>
            </div>
          </div>
          <div class="mt-5 flex gap-2">
            <button
              v-for="day in ['WED|9 Sep', 'THU|10 Sep', 'FRI|11 Sep']"
              :key="day"
              type="button"
              :class="[
                'grid min-w-20 gap-1 rounded-md border p-2 text-[11px]',
                day.startsWith('WED')
                  ? 'border-rose bg-rose-soft text-rose'
                  : 'border-stone-200 text-stone-500',
              ]"
            >
              <strong class="text-[10px] text-ink">{{
                day.split("|")[0]
              }}</strong
              ><span>{{ day.split("|")[1] }}</span>
            </button>
          </div>
          <div class="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            <button
              v-for="slot in slots"
              :key="slot"
              type="button"
              :class="[
                'rounded-md border p-2 text-xs',
                selectedTime === slot
                  ? 'border-rose ring-1 ring-rose'
                  : 'border-stone-200',
              ]"
              @click="selectedTime = slot"
            >
              {{ slot }}
            </button>
          </div>
          <div class="mt-7 flex gap-3">
            <span
              class="grid size-6 shrink-0 place-items-center rounded-full bg-ink text-[11px] font-bold text-white"
              >3</span
            >
            <div>
              <h2 class="font-semibold">Your details</h2>
              <p class="mt-1 text-xs text-stone-500">
                We will send your confirmation by email.
              </p>
            </div>
          </div>
          <div class="mt-5 grid gap-3">
            <label class="grid gap-1.5 text-[11px] font-semibold text-stone-500"
              >Full name<InputText placeholder="e.g. Eleni Georgiou" /></label
            ><label
              class="grid gap-1.5 text-[11px] font-semibold text-stone-500"
              >Email address<InputText
                type="email"
                placeholder="you@example.com" /></label
            ><label
              class="grid gap-1.5 text-[11px] font-semibold text-stone-500"
              >Phone number<InputText type="tel" placeholder="+30 69..."
            /></label>
          </div>
          <Button
            :label="`Confirm ${selectedTime} appointment`"
            icon="pi pi-check"
            class="mt-6 w-full"
            severity="contrast"
            @click="booked = true"
          />
        </section>
      </section>
      <section v-else class="mx-auto mt-24 max-w-xl text-center">
        <span
          class="mx-auto grid size-16 place-items-center rounded-full bg-teal-soft text-teal"
          ><Check :size="30"
        /></span>
        <p class="eyebrow mt-6">Booking confirmed</p>
        <h1 class="font-display text-5xl">See you soon.</h1>
        <p class="mt-4 leading-7 text-stone-500">
          Your appointment at {{ demoBusiness.name }} is booked for
          <strong>{{ selectedDate }} at {{ selectedTime }}</strong
          >.
        </p>
        <div
          class="mx-auto my-7 grid max-w-xs gap-2 rounded-lg border border-stone-200 bg-white p-5 text-left"
        >
          <strong>{{ selectedService.name }}</strong
          ><span class="text-xs text-stone-500"
            >{{ selectedService.durationMinutes }} minutes ·
            {{ (selectedService.priceCents / 100).toFixed(2) }} €</span
          ><span class="flex items-center gap-2 text-xs text-stone-500"
            ><MapPin :size="15" /> {{ demoBusiness.city }}, Greece</span
          >
        </div>
        <NuxtLink
          to="/"
          class="inline-flex rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold"
          >Return to studio</NuxtLink
        >
      </section>
    </main>
  </div>
</template>
