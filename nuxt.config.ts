// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: [
    "@nuxt/ui",
    "@primevue/nuxt-module",
    "@vueuse/nuxt",
    "@nuxtjs/supabase",
  ],
  css: ["~/assets/css/tailwind.css"],
  runtimeConfig: {
    public: {
      PRIMEUI_LICENSE:
        process.env.PRIMEUI_LICENSE ?? process.env.PRIMEVUE_LICENSE_KEY ?? "",
    },
  },
  supabase: {
    // URL/key are read automatically from SUPABASE_URL / SUPABASE_KEY env vars.
    types: false,
    redirectOptions: {
      login: "/login",
      callback: "/confirm",
      // Routes that require an authenticated Supabase session.
      include: ["/dashboard", "/dashboard/**", "/onboarding", "/admin", "/admin/**"],
      exclude: ["/admin/login"],
    },
  },
  primevue: {
    options: {
      ripple: true,
      inputVariant: "filled",
    },
  },
});
