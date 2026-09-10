// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: ["@nuxt/ui", "@primevue/nuxt-module", "@vueuse/nuxt"],
  css: ["~/assets/css/tailwind.css"],
  runtimeConfig: {
    public: {
      PRIMEUI_LICENSE:
        process.env.PRIMEUI_LICENSE ?? process.env.PRIMEVUE_LICENSE_KEY ?? "",
    },
  },
  primevue: {
    options: {
      ripple: true,
      inputVariant: "filled",
    },
  },
});
