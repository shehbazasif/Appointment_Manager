<template>
  <div class="flex min-h-screen flex-col bg-slate-50 text-slate-900">
    <MainNav />
    <main class="flex-1">
      <slot />
    </main>
    <SiteFooter />
  </div>
</template>