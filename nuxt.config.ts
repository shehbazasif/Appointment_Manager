// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  experimental: { tasks: true },
  nitro: {
    // Automatic reminder emails: the worker sweeps the queue every 5 minutes.
    scheduledTasks: {
      "*/5 * * * *": ["notifications:reminders"],
    },
  },
  modules: [
    "@nuxt/ui",
    "@primevue/nuxt-module",
    "@vueuse/nuxt",
    "@nuxtjs/supabase",
  ],
  css: ["~/assets/css/tailwind.css"],
  nitro: {
    // Automatic appointment reminder emails — runs the worker every 5 minutes
    // (server/tasks/notifications/reminders.ts). No external cron needed.
    scheduledTasks: {
      "*/5 * * * *": ["notifications:reminders"],
    },
    experimental: {
      tasks: true,
    },
  },
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
      include: ["/dashboard", "/dashboard/**", "/admin", "/admin/**"],
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
