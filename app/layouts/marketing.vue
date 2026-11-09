<template>
  <div class="site-focus flex min-h-dvh flex-col overflow-x-clip bg-[#fbfaf8] text-stone-900">
    <a
      href="#main"
      class="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-xl focus:bg-white focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:shadow-lg"
    >
      Skip to content
    </a>
    <Navbar />
    <main id="main" class="flex-1">
      <slot />
    </main>
    <Footer />
  </div>
</template>
