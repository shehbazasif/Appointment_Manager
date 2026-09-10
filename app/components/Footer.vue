<script setup lang="ts">
const navigation = {
  product: [
    { name: 'Features', href: '/features' },
    { name: 'Integrations', href: '#' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'Changelog', href: '#' },
    { name: 'Roadmap', href: '#' },
    { name: 'Security', href: '/security' },
  ],
  company: [
    { name: 'About Us', href: '#' },
    { name: 'Careers', href: '#' },
    { name: 'Press Kit', href: '#' },
    { name: 'Partners', href: '#' },
    { name: 'Contact', href: '#' },
  ],
  resources: [
    { name: 'Blogs', href: '#' },
    { name: 'Documentation', href: '#' },
    { name: 'API Reference', href: '#' },
    { name: 'Help Center', href: '#' },
    { name: 'Community', href: '#' },
    { name: 'Tutorials', href: '#' },
    { name: 'Webinars', href: '#' },
  ],
  legal: [
    { name: 'Privacy Policy', href: '/privacy' },
    { name: 'Terms of Service', href: '/terms' },
    { name: 'Cookie Policy', href: '#' },
    { name: 'Compliance', href: '#' },
    { name: 'Sitemap', href: '#' },
  ],
}
</script>

<template>
  <footer class="relative overflow-hidden bg-stone-200 pt-16 pb-12 text-stone-700">
    <div class="mx-auto max-w-7xl px-6 lg:px-12">
      <div class="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
        
        <!-- Brand Info & Socials -->
        <div class="space-y-6 lg:col-span-4">
          <NuxtLink to="/" class="inline-flex items-center gap-2.5 text-xl font-bold tracking-tight text-stone-900">
            <span class="grid size-8 place-items-center rounded-lg bg-stone-900 text-sm font-black text-white shadow-sm">
              R
            </span>
            <span>rantevou<span class="text-rose-600">OS</span></span>
          </NuxtLink>
          
          <p class="max-w-sm text-sm leading-relaxed text-stone-500">
            Join hundreds of Greek salons and appointment businesses using RantevouOS to simplify their workflow.
          </p>

          <!-- Social Icon Buttons -->
          <div class="flex items-center gap-2 pt-2">
            <a href="#" class="grid size-9 place-items-center rounded-xl border border-stone-200/80 bg-white/80 text-stone-700 shadow-sm transition-all hover:bg-stone-100 hover:text-stone-900">
              <span class="text-xs font-bold">𝕏</span>
            </a>
            <a href="#" class="grid size-9 place-items-center rounded-xl border border-stone-200/80 bg-white/80 text-stone-700 shadow-sm transition-all hover:bg-stone-100 hover:text-stone-900">
              <span class="text-xs font-bold">IG</span>
            </a>
            <a href="#" class="grid size-9 place-items-center rounded-xl border border-stone-200/80 bg-white/80 text-stone-700 shadow-sm transition-all hover:bg-stone-100 hover:text-stone-900">
              <span class="text-xs font-bold">in</span>
            </a>
            <a href="#" class="grid size-9 place-items-center rounded-xl border border-stone-200/80 bg-white/80 text-stone-700 shadow-sm transition-all hover:bg-stone-100 hover:text-stone-900">
              <span class="text-xs font-bold">YT</span>
            </a>
          </div>
        </div>

        <!-- Links Grid -->
        <div class="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:col-span-8">
          <div>
            <h3 class="text-sm font-bold text-stone-900">Product</h3>
            <ul class="mt-4 space-y-2.5 text-xs font-medium text-stone-500">
              <li v-for="item in navigation.product" :key="item.name">
                <NuxtLink :to="item.href" class="transition-colors hover:text-stone-900">{{ item.name }}</NuxtLink>
              </li>
            </ul>
          </div>

          <div>
            <h3 class="text-sm font-bold text-stone-900">Company</h3>
            <ul class="mt-4 space-y-2.5 text-xs font-medium text-stone-500">
              <li v-for="item in navigation.company" :key="item.name">
                <a :href="item.href" class="transition-colors hover:text-stone-900">{{ item.name }}</a>
              </li>
            </ul>
          </div>

          <div>
            <h3 class="text-sm font-bold text-stone-900">Resources</h3>
            <ul class="mt-4 space-y-2.5 text-xs font-medium text-stone-500">
              <li v-for="item in navigation.resources" :key="item.name">
                <a :href="item.href" class="transition-colors hover:text-stone-900">{{ item.name }}</a>
              </li>
            </ul>
          </div>

          <div>
            <h3 class="text-sm font-bold text-stone-900">Legal</h3>
            <ul class="mt-4 space-y-2.5 text-xs font-medium text-stone-500">
              <li v-for="item in navigation.legal" :key="item.name">
                <NuxtLink :to="item.href" class="transition-colors hover:text-stone-900">{{ item.name }}</NuxtLink>
              </li>
            </ul>
          </div>
        </div>

      </div>

      <!-- Bottom Copyright Line -->
      <div class="mt-16 flex flex-col items-center justify-between gap-4 border-t border-stone-300/50 pt-8 text-xs font-medium text-stone-500 sm:flex-row">
        <p>&copy; {{ new Date().getFullYear() }} RantevouOS, Inc. All rights reserved.</p>
        <p>Made with <span class="text-rose-500">♥</span> in Athens, Greece</p>
      </div>
    </div>
  </footer>
</template>