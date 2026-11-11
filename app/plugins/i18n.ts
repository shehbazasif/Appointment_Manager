/** Load the right dictionary before the first render (SSR + client). */
export default defineNuxtPlugin(async () => {
  await initLocale();
});
