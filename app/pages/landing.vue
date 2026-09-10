<template>
  <main
    class="min-h-screen bg-[radial-gradient(circle_at_80%_0%,#f8eee9_0,transparent_32rem),#fbfaf8]"
  >
    <header
      class="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 lg:px-10"
    >
      <NuxtLink to="/landing" class="text-xl font-bold tracking-tight"
        >rantevou<span class="text-rose">OS</span></NuxtLink
      >
      <nav class="flex items-center gap-3">
        <NuxtLink
          to="/login"
          class="rounded-lg px-4 py-2 text-sm font-semibold text-stone-600"
          >Sign in</NuxtLink
        ><NuxtLink
          to="/register"
          class="rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white"
          >Start free</NuxtLink
        >
      </nav>
    </header>
    <section
      class="mx-auto grid max-w-7xl gap-12 px-5 pb-20 pt-16 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:px-10 lg:pt-24"
    >
      <div>
        <p class="eyebrow">Greece-first appointment management</p>
        <h1
          class="max-w-3xl font-display text-5xl leading-[1.05] tracking-tight lg:text-7xl"
        >
          Your business calendar, customers and reminders in one place.
        </h1>
        <p class="mt-6 max-w-xl text-lg leading-8 text-stone-500">
          RantevouOS helps salons, studios, spas and appointment businesses run
          every booking with less admin.
        </p>
        <div class="mt-8 flex flex-wrap gap-3">
          <NuxtLink
            to="/register"
            class="rounded-lg bg-ink px-5 py-3 text-sm font-semibold text-white"
            >Create your business</NuxtLink
          ><NuxtLink
            to="/book/fero-ferto"
            class="rounded-lg border border-stone-200 bg-white px-5 py-3 text-sm font-semibold"
            >See a booking page</NuxtLink
          >
        </div>
      </div>
      <div
        class="surface relative overflow-hidden p-5 shadow-2xl shadow-stone-900/10 lg:p-7"
      >
        <div
          class="flex items-center justify-between border-b border-stone-100 pb-5"
        >
          <div>
            <p class="eyebrow">Today at Maria Beauty Studio</p>
            <h2 class="text-xl font-semibold">Wednesday, 9 September</h2>
          </div>
          <span
            class="rounded-full bg-teal-soft px-3 py-1 text-xs font-semibold text-teal"
            >Live</span
          >
        </div>
        <div class="grid gap-3 pt-5">
          <div
            v-for="item in [
              {
                time: '09:30',
                name: 'Anna Kouris',
                service: 'Signature facial',
              },
              { time: '10:00', name: 'Niki Vrettou', service: 'Gel manicure' },
              {
                time: '11:15',
                name: 'Dimitris Laskaris',
                service: 'Blow dry & styling',
              },
            ]"
            :key="item.time"
            class="flex items-center gap-3 rounded-lg border border-stone-100 p-3"
          >
            <span class="text-xs text-stone-400">{{ item.time }}</span
            ><span class="size-2 rounded-full bg-rose"></span>
            <div>
              <strong class="block text-sm">{{ item.name }}</strong
              ><span class="text-xs text-stone-500">{{ item.service }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
    <section
      class="mx-auto grid max-w-7xl gap-3 px-5 pb-20 sm:grid-cols-3 lg:px-10"
    >
      <article
        v-for="item in [
          {
            title: 'Online booking',
            text: 'Share one beautiful booking link with your customers.',
          },
          {
            title: 'Clear daily view',
            text: 'See appointments, status and staff in one calm workspace.',
          },
          {
            title: 'Customer memory',
            text: 'Keep visits, contact details and history together.',
          },
        ]"
        :key="item.title"
        class="surface p-5"
      >
        <h2 class="font-semibold">{{ item.title }}</h2>
        <p class="mt-2 text-sm leading-6 text-stone-500">{{ item.text }}</p>
      </article>
    </section>
  </main>
</template>
