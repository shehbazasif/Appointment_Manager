<script setup lang="ts">
// Phone / iPhone support: safe-area aware viewport + "Add to Home Screen" app.
useHead({
  htmlAttrs: { lang: "en" },
  titleTemplate: (title) => title || brandTitle(),
  meta: [
    {
      name: "viewport",
      content: "width=device-width, initial-scale=1, viewport-fit=cover",
    },
    { name: "theme-color", content: "#ffffff" },
    { name: "apple-mobile-web-app-capable", content: "yes" },
    { name: "mobile-web-app-capable", content: "yes" },
    { name: "apple-mobile-web-app-title", content: BRAND.name },
    { name: "application-name", content: BRAND.name },
    { name: "apple-mobile-web-app-status-bar-style", content: "default" },
    { name: "format-detection", content: "telephone=no" },
  ],
  link: [
    { rel: "manifest", href: "/manifest.webmanifest" },
    { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
    { rel: "icon", type: "image/png", sizes: "192x192", href: "/icon-192.png" },
  ],
  script: [
    // Enables scroll-reveal animations only when JavaScript runs
    // (without JS every section is simply visible).
    { innerHTML: "document.documentElement.classList.add('js-reveal')", tagPosition: "head" },
  ],
});
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
