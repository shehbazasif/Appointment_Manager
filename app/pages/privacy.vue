<script setup lang="ts">
definePageMeta({ layout: "marketing" });
usePageSeo({
  path: "/privacy",
  title: "Privacy Policy",
  description: `How ${BRAND.name} collects, uses and protects personal data under the GDPR, including cookies.`,
});
// NOTE: this is a solid starting template. Have it reviewed by a lawyer for your company details.
</script>

<template>
  <SiteLegal eyebrow="Legal" title="Privacy Policy" updated="9 November 2026">
    <h2>1. Who we are</h2>
    <p>
      {{ BRAND.name }} (“we”, “us”) provides online booking and appointment software to businesses. For data about
      our own customers (business owners and their staff accounts) we are the <b>data controller</b>. For data that a
      business stores about its own customers (for example names, phone numbers and appointments) the business is
      the controller and we act as its <b>data processor</b>.
    </p>
    <p>Questions about privacy: <a :href="`mailto:${BRAND.email}`">{{ BRAND.email }}</a>.</p>

    <h2>2. What we collect</h2>
    <ul>
      <li><b>Account data:</b> name, email, phone number, business name, address, country, time zone and currency.</li>
      <li><b>Booking data:</b> customer name, phone, email, chosen service, staff, date and time, notes, and — only if the customer chooses to share it — their location for on-site services.</li>
      <li><b>Staff & attendance data:</b> staff names, working hours and Enter/Exit times.</li>
      <li><b>Technical data:</b> sign-in session cookies, IP address and basic logs needed to keep the service secure.</li>
      <li><b>Messages:</b> what you send us through the contact form.</li>
    </ul>

    <h2>3. Why we use it (legal basis)</h2>
    <ul>
      <li>To provide the service you signed up for — GDPR Art. 6(1)(b), contract.</li>
      <li>To send booking confirmations and reminders on behalf of the business — Art. 6(1)(b) and the business's instructions.</li>
      <li>To keep accounts secure and prevent abuse — Art. 6(1)(f), legitimate interest.</li>
      <li>To answer your messages — Art. 6(1)(f), legitimate interest.</li>
    </ul>
    <p>We never sell personal data and we never show one business's data to another business.</p>

    <h2>4. Who we share it with</h2>
    <p>
      We use trusted providers to run the service, such as our database and authentication provider, our hosting
      provider and our email delivery provider. They process data only on our instructions and under data-processing
      agreements. If data is transferred outside the EEA, we rely on safeguards such as the EU Standard Contractual Clauses.
    </p>

    <h2>5. How long we keep it</h2>
    <p>
      We keep account and booking data while your account is active. After you close your account we delete or
      anonymise it within 90 days, unless we must keep some records longer by law (for example invoices).
    </p>

    <h2>6. Your rights</h2>
    <p>
      You have the right to access, correct, delete, restrict or object to the use of your personal data, and to
      receive it in a portable format. If you are a customer of a business that uses {{ BRAND.name }}, please contact
      that business first; we will help them answer you. You can also complain to your local data protection authority
      (in Greece: the Hellenic Data Protection Authority).
    </p>

    <h2 id="cookies">7. Cookies</h2>
    <p>
      We only use cookies that are needed for the service to work, such as the cookie that keeps you signed in. We do
      not use advertising cookies. Your browser may also store small settings (for example a chosen filter) on your device.
    </p>

    <h2>8. Security</h2>
    <p>
      Connections are encrypted (HTTPS), passwords are never stored in plain text, and each business can only access its
      own data. No system is perfectly secure, but we work hard to protect your data and will tell you without delay if
      a breach affects you.
    </p>

    <h2>9. Changes</h2>
    <p>If we change this policy we will update the date above and, for important changes, tell account owners by email.</p>
  </SiteLegal>
</template>
