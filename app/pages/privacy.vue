<script setup lang="ts">
useHead({ title: "Privacy Policy — RantevouOS" });
</script>

<template>
  <div
    class="min-h-screen bg-[radial-gradient(circle_at_80%_0%,#f8eee9_0,transparent_32rem),#fbfaf8]"
  >
    <Navbar />
    <Header />

    <main class="mx-auto max-w-4xl px-6 py-16 lg:px-10 lg:py-20">
      <p class="text-xs font-semibold uppercase tracking-wider text-rose-600">
        Compliance & Legal
      </p>
      <h1
        class="mt-2 font-display text-3xl font-bold text-stone-900 sm:text-4xl"
      >
        Privacy Policy (GDPR Compliance)
      </h1>
      <p class="mt-2 text-xs text-stone-400">
        Effective date: September 10, 2026
      </p>

      <div class="mt-8 space-y-6 text-sm leading-relaxed text-stone-600">
        <section>
          <h2 class="text-base font-bold text-stone-900">1. Data Controller</h2>
          <p class="mt-2">
            RantevouOS operates as a Data Processor on behalf of appointment
            businesses in Greece (Data Controllers). For platform account
            management, RantevouOS is the Data Controller.
          </p>
        </section>

        <section>
          <h2 class="text-base font-bold text-stone-900">
            2. Information We Collect
          </h2>
          <ul class="mt-2 list-disc pl-5 space-y-1">
            <li>
              <strong>Business Owners & Staff:</strong> Name, email address,
              phone number, and password hashes (Argon2id encrypted).
            </li>
            <li>
              <strong>End Customers:</strong> Name, phone number, email address,
              and appointment records submitted during public booking.
            </li>
            <li>
              <strong>System Metadata:</strong> Session cookies (HttpOnly,
              SameSite), IP addresses, and standard audit logs.
            </li>
          </ul>
        </section>

        <section>
          <h2 class="text-base font-bold text-stone-900">
            3. Legal Basis for Processing
          </h2>
          <p class="mt-2">
            Processing is conducted under Article 6(1)(b) of the GDPR
            (performance of a contract to deliver appointment scheduling
            services) and Article 6(1)(f) (legitimate interests in platform
            security).
          </p>
        </section>

        <section>
          <h2 class="text-base font-bold text-stone-900">
            4. Your Rights under GDPR
          </h2>
          <p class="mt-2">
            Greek and EU residents maintain the following rights regarding their
            personal data:
          </p>
          <ul class="mt-2 list-disc pl-5 space-y-1">
            <li>
              <strong>Right to Access & Rectification:</strong> Request a copy
              of your stored records or correct inaccuracies.
            </li>
            <li>
              <strong>Right to Erasure ("Right to be Forgotten"):</strong>
              Request complete deletion of personal customer records.
            </li>
            <li>
              <strong>Data Portability:</strong> Export appointment and customer
              history in structured JSON or CSV formats.
            </li>
          </ul>
        </section>

        <section>
          <h2 class="text-base font-bold text-stone-900">
            5. Tenant Isolation & Security
          </h2>
          <p class="mt-2">
            Every business account operates within strict database multi-tenant
            isolation. No Business entity can view, query, or extract data
            belonging to another business entity.
          </p>
        </section>
      </div>
    </main>

    <Footer />
  </div>
</template>
