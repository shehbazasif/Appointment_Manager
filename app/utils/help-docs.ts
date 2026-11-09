import { BRAND } from "#shared/utils/brand";
/**
 * Help center articles (docs-style, /help and /help/<slug>).
 * Each article has sections; each section becomes an H2 and an entry in
 * the "On this page" table of contents.
 */
export interface DocBlock {
  /** plain paragraph */
  p?: string;
  /** numbered steps */
  steps?: string[];
  /** bullet list */
  list?: string[];
  /** highlighted box */
  tip?: string;
  note?: string;
  warning?: string;
}
export interface DocSection {
  id: string;
  title: string;
  blocks: DocBlock[];
}
export interface DocArticle {
  slug: string;
  group: string;
  title: string;
  description: string;
  sections: DocSection[];
}

export const HELP_DOCS: DocArticle[] = [
  // ───────────────────────── Getting started
  {
    slug: "introduction",
    group: "Getting started",
    title: "Introduction",
    description: "What the app does, who it is for and how the pieces fit together.",
    sections: [
      {
        id: "what-is-it",
        title: "What it is",
        blocks: [
          { p: `${BRAND.name} is an online booking and appointment manager for small businesses: salons, clinics, pet care, towing, home services and anyone who works with appointments.` },
          { p: "There are two sides: a public booking page that your customers use, and a dashboard where you and your team manage the day." },
        ],
      },
      {
        id: "how-it-fits",
        title: "How the pieces fit together",
        blocks: [
          {
            list: [
              "Services — what customers can book, with price, duration and category.",
              "Working hours — when your business and each staff member are available.",
              "Booking page — your public link where customers pick a service and a free time.",
              "Bookings — every appointment, with status, staff and (optionally) the customer's location.",
              "Customers — contact details and visit history, created automatically from bookings.",
            ],
          },
          { tip: "Follow the articles in the Getting started and Set up your booking page groups in order. After that your business is ready to take bookings." },
        ],
      },
      {
        id: "devices",
        title: "Devices",
        blocks: [
          { p: "Everything runs in the browser. It works on iPhone, Android, Mac and Windows. On a phone the dashboard has a bottom tab bar and big buttons; on a computer you get full tables and the calendar." },
        ],
      },
    ],
  },
  {
    slug: "create-account",
    group: "Getting started",
    title: "Create your account",
    description: "Sign up, confirm your email and open the dashboard for the first time.",
    sections: [
      {
        id: "sign-up",
        title: "Sign up",
        blocks: [
          {
            steps: [
              "Open the sign-up page (Start free trial).",
              "Enter your first and last name, email and a password.",
              "Enter your business name. The web address of your booking page is suggested from it — you can change it.",
              "Tap Create business.",
            ],
          },
        ],
      },
      {
        id: "confirm-email",
        title: "Confirm your email",
        blocks: [
          { p: "We send you an email with a confirmation link. Open it on the same device and you are signed in automatically." },
          { note: "No email after a few minutes? Check your spam or promotions folder, then try signing in." },
        ],
      },
      {
        id: "first-look",
        title: "Your first look at the dashboard",
        blocks: [
          { p: "The home screen shows Today's schedule first, then upcoming bookings, a few numbers and shortcuts to Staff, Services, Hours and your Booking link." },
        ],
      },
    ],
  },
  {
    slug: "business-settings",
    group: "Getting started",
    title: "Business settings",
    description: "Your business name, contact details, address and booking page options.",
    sections: [
      {
        id: "profile",
        title: "General profile",
        blocks: [
          { p: "Open Settings from the menu. In General Profile add your business name, phone, email and street address. Customers see these on your booking page and in their emails." },
        ],
      },
      {
        id: "booking-options",
        title: "Booking page options",
        blocks: [
          {
            list: [
              "Hide prices on service list — customers only see the price after they choose a service.",
              "On-location service — customers can share their location when booking (see On-location jobs).",
            ],
          },
          { tip: "Change a setting and press Save at the bottom of the page. Changes are live on your booking page right away." },
        ],
      },
    ],
  },
  {
    slug: "country-time-zone-currency",
    group: "Getting started",
    title: "Country, time zone & currency",
    description: "Make sure times and prices are correct wherever your business is.",
    sections: [
      {
        id: "choose-country",
        title: "Choose your country",
        blocks: [
          { p: "In Settings → Location & Localization, pick your country from the searchable list. The time zone and currency are filled in for you — for example Qatar sets Asia/Qatar and QAR." },
          { p: "You can still change either one. The time zone list includes every time zone, grouped with your own country first." },
        ],
      },
      {
        id: "why-it-matters",
        title: "Why the time zone matters",
        blocks: [
          { p: "Working hours and free booking times are calculated in your business time zone. A customer booking from abroad still sees your local times." },
          { warning: "If your times look one or more hours off, the time zone is wrong. Fix it in Settings or at the top of Working Hours." },
        ],
      },
    ],
  },

  // ───────────────────────── Set up your booking page
  {
    slug: "services",
    group: "Set up your booking page",
    title: "Services & categories",
    description: "Add what customers can book, with price, duration, currency and category.",
    sections: [
      {
        id: "add-service",
        title: "Add a service",
        blocks: [
          {
            steps: [
              "Open Services and tap Add service.",
              "Enter the name and the duration in minutes.",
              "Enter the price and pick the currency you charge in.",
              "Choose a category, then save.",
            ],
          },
        ],
      },
      {
        id: "categories",
        title: "Categories",
        blocks: [
          { p: "Categories group services on your booking page, for example Hair, Nails, Check-ups or Emergency. Add and remove them in the category panel on the Services page." },
          { note: "When you remove a category, its services are moved to General — nothing is deleted." },
        ],
      },
    ],
  },
  {
    slug: "working-hours",
    group: "Set up your booking page",
    title: "Working hours",
    description: "Set opening days and times so customers can only book when you are open.",
    sections: [
      {
        id: "set-hours",
        title: "Set your hours",
        blocks: [
          {
            steps: [
              "Open Working Hours (Hours on the phone).",
              "Check the time zone in the card at the top.",
              "Turn each day on or off and set start and end times. The Standard (Mon - Sat) preset fills a typical week.",
              "Save.",
            ],
          },
        ],
      },
      {
        id: "staff-hours",
        title: "Hours per staff member",
        blocks: [
          { p: "Each staff member can have their own working days. Customers only see a time when the chosen person is free. See Staff." },
        ],
      },
    ],
  },
  {
    slug: "booking-link",
    group: "Set up your booking page",
    title: "Share your booking link",
    description: "Get bookings from Instagram, Google, WhatsApp and your shop window.",
    sections: [
      {
        id: "copy-link",
        title: "Copy your link",
        blocks: [
          { p: "Open Share Booking Link in the menu. Your public booking page address is shown at the top — copy it or open it to see what customers see." },
        ],
      },
      {
        id: "where-to-share",
        title: "Where to share it",
        blocks: [
          {
            list: [
              "Your Instagram and Facebook bio.",
              "Your Google Business profile (the “Book” or website button).",
              "Your own website.",
              "WhatsApp messages to regular customers.",
            ],
          },
        ],
      },
      {
        id: "qr-code",
        title: "QR code for your counter",
        blocks: [
          { p: "The same page has a QR code. Print it for your counter or window so walk-in customers can book their next visit with their camera." },
        ],
      },
    ],
  },

  // ───────────────────────── Daily work
  {
    slug: "bookings",
    group: "Daily work",
    title: "Managing bookings",
    description: "Create, reschedule, check in and complete appointments.",
    sections: [
      {
        id: "new-booking",
        title: "Add a booking by hand",
        blocks: [
          { p: "For phone or walk-in customers, tap New Appointment on the home screen or on Bookings. Pick the customer, service, staff member, date and time." },
        ],
      },
      {
        id: "statuses",
        title: "Booking statuses",
        blocks: [
          {
            list: [
              "Pending — waiting for confirmation.",
              "Confirmed — booked and expected.",
              "Checked in — the customer has arrived.",
              "Completed — the visit is done.",
              "Cancelled / No-show — did not happen.",
            ],
          },
        ],
      },
      {
        id: "filters",
        title: "Find a booking",
        blocks: [
          { p: "On Bookings use the search box and Filters (date range, status, staff). On a phone each booking is a card with the main actions as buttons." },
          { tip: "Tap a number card on the home screen (Today, Upcoming) to jump straight to that filtered list." },
        ],
      },
      {
        id: "reschedule",
        title: "Edit or reschedule",
        blocks: [
          { p: "Tap Edit / Reschedule on a booking to change the time, service or staff member. Use the message button to let the customer know." },
        ],
      },
    ],
  },
  {
    slug: "customers",
    group: "Daily work",
    title: "Customers",
    description: "Contact details, visit history and quick messages.",
    sections: [
      {
        id: "directory",
        title: "Clients directory",
        blocks: [
          { p: "Customers are added automatically when they book. You can also add them by hand on the Customers page. Open a customer to see their visits and notes." },
        ],
      },
      {
        id: "messages",
        title: "Call, WhatsApp or email",
        blocks: [
          { p: "From a customer or a booking you can call, open WhatsApp or send an email using templates." },
        ],
      },
      {
        id: "privacy",
        title: "Remove a customer's data",
        blocks: [
          { p: "If a customer asks to be forgotten, use Anonymize customer data on their profile. Their bookings stay in your history without personal details." },
          { warning: "Anonymizing cannot be undone." },
        ],
      },
    ],
  },
  {
    slug: "on-location",
    group: "Daily work",
    title: "On-location jobs",
    description: "For towing, mobile services and home visits: customer location, driver hand-off and job status.",
    sections: [
      {
        id: "turn-on",
        title: "Turn it on",
        blocks: [
          { p: "In Settings, switch on On-location service. Your booking page then asks customers where the job is." },
        ],
      },
      {
        id: "customer-location",
        title: "How customers share a location",
        blocks: [
          {
            list: [
              "Tap Share my location (the phone asks for permission), or",
              "paste a Google Maps link, or type coordinates, and add a short note such as “blue car, gate 3”.",
            ],
          },
          { p: "For phone bookings you can add the location yourself when you create the booking." },
          { note: "On iPhone, location sharing needs Safari to be allowed in Settings → Privacy & Security → Location Services." },
        ],
      },
      {
        id: "assign",
        title: "Assign and hand off",
        blocks: [
          {
            steps: [
              "Assign the booking to a staff member.",
              "Tap WhatsApp to send them the job details and the map link.",
              "They tap Open map for directions.",
              "Mark the job On the way, then On location.",
            ],
          },
        ],
      },
    ],
  },

  // ───────────────────────── Team
  {
    slug: "staff",
    group: "Team",
    title: "Staff",
    description: "Add team members, their contact details and working days.",
    sections: [
      {
        id: "add-staff",
        title: "Add staff",
        blocks: [
          { p: "Open Staff and add each person with their name, role and phone number. The phone number is used for Call and WhatsApp buttons." },
        ],
      },
      {
        id: "schedules",
        title: "Working days",
        blocks: [
          { p: "Set the days and times each person works. The staff list shows who is on duty today." },
        ],
      },
    ],
  },
  {
    slug: "attendance",
    group: "Team",
    title: "Attendance & QR badges",
    description: "Track when staff arrive and leave with personal QR badges.",
    sections: [
      {
        id: "badges",
        title: "Give everyone a badge",
        blocks: [
          { p: "Open Attendance → QR badges. Each staff member has a personal QR badge. Download it and share it with them, or print it." },
        ],
      },
      {
        id: "enter-exit",
        title: "Enter and Exit",
        blocks: [
          {
            steps: [
              "On the business phone or tablet, open Attendance.",
              "Tap the green Enter button when someone arrives, or the red Exit button when they leave.",
              "Hold their QR badge in front of the camera. The phone vibrates when it is recorded.",
            ],
          },
          { note: "If someone scans Enter twice, or Exit without Enter, you see a clear message and nothing is recorded twice." },
        ],
      },
    ],
  },

  // ───────────────────────── Data & devices
  {
    slug: "import",
    group: "Data & devices",
    title: "Import from Excel or CSV",
    description: "Bring your existing customer or staff list in a few minutes.",
    sections: [
      {
        id: "prepare",
        title: "Prepare the file",
        blocks: [
          { p: "Save your list as .xlsx or .csv with one row per person and a header row, for example Name, Phone, Email." },
        ],
      },
      {
        id: "import-steps",
        title: "Import it",
        blocks: [
          {
            steps: [
              "Open Customers (or Staff) and choose Import.",
              "Select your file.",
              "Check that each column is matched to the right field.",
              "Check the preview and confirm.",
            ],
          },
          { tip: "Try a file with a few rows first, then import the full list." },
        ],
      },
    ],
  },
  {
    slug: "install-app",
    group: "Data & devices",
    title: "Install on iPhone & Android",
    description: "Add the dashboard to your home screen so it opens like an app.",
    sections: [
      {
        id: "iphone",
        title: "iPhone (Safari)",
        blocks: [
          {
            steps: [
              "Open the dashboard in Safari and sign in.",
              "Tap the Share button.",
              "Choose Add to Home Screen, then Add.",
            ],
          },
          { p: "Open it from the home screen: it runs full-screen with a back button and the bottom tab bar." },
        ],
      },
      {
        id: "android",
        title: "Android (Chrome)",
        blocks: [
          { steps: ["Open the dashboard in Chrome and sign in.", "Tap the ⋮ menu.", "Choose Add to Home screen or Install app."] },
        ],
      },
    ],
  },
];

export const HELP_GROUPS = [...new Set(HELP_DOCS.map((d) => d.group))];
export const findHelpDoc = (slug: string) => HELP_DOCS.find((d) => d.slug === slug);
