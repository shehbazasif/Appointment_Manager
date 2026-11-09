import { COUNTRIES } from "./countries";

/**
 * Country -> time zone(s) + currency. Picking a country in Settings / Working
 * hours pre-fills these; countries with several zones show a zone dropdown.
 * Keys are the ISO codes used in COUNTRIES (app/utils/countries.ts).
 */
export const COUNTRY_REGION: Record<string, { currency: string; zones: string[] }> = {
  GR: { currency: "EUR", zones: ["Europe/Athens"] },
  CY: { currency: "EUR", zones: ["Asia/Nicosia"] },
  PK: { currency: "PKR", zones: ["Asia/Karachi"] },
  AE: { currency: "AED", zones: ["Asia/Dubai"] },
  QA: { currency: "QAR", zones: ["Asia/Qatar"] },
  SA: { currency: "SAR", zones: ["Asia/Riyadh"] },
  KW: { currency: "KWD", zones: ["Asia/Kuwait"] },
  BH: { currency: "BHD", zones: ["Asia/Bahrain"] },
  OM: { currency: "OMR", zones: ["Asia/Muscat"] },
  IN: { currency: "INR", zones: ["Asia/Kolkata"] },
  BD: { currency: "BDT", zones: ["Asia/Dhaka"] },
  LK: { currency: "LKR", zones: ["Asia/Colombo"] },
  NP: { currency: "NPR", zones: ["Asia/Kathmandu"] },
  AF: { currency: "AFN", zones: ["Asia/Kabul"] },
  EG: { currency: "EGP", zones: ["Africa/Cairo"] },
  TR: { currency: "TRY", zones: ["Europe/Istanbul"] },
  GB: { currency: "GBP", zones: ["Europe/London"] },
  IE: { currency: "EUR", zones: ["Europe/Dublin"] },
  US: {
    currency: "USD",
    zones: [
      "America/New_York",
      "America/Chicago",
      "America/Denver",
      "America/Phoenix",
      "America/Los_Angeles",
      "America/Anchorage",
      "Pacific/Honolulu",
    ],
  },
  CA: {
    currency: "CAD",
    zones: [
      "America/Toronto",
      "America/Vancouver",
      "America/Edmonton",
      "America/Winnipeg",
      "America/Halifax",
      "America/St_Johns",
      "America/Regina",
    ],
  },
  DE: { currency: "EUR", zones: ["Europe/Berlin"] },
  FR: { currency: "EUR", zones: ["Europe/Paris"] },
  IT: { currency: "EUR", zones: ["Europe/Rome"] },
  ES: { currency: "EUR", zones: ["Europe/Madrid", "Atlantic/Canary"] },
  PT: { currency: "EUR", zones: ["Europe/Lisbon", "Atlantic/Azores"] },
  NL: { currency: "EUR", zones: ["Europe/Amsterdam"] },
  BE: { currency: "EUR", zones: ["Europe/Brussels"] },
  CH: { currency: "CHF", zones: ["Europe/Zurich"] },
  AT: { currency: "EUR", zones: ["Europe/Vienna"] },
  SE: { currency: "SEK", zones: ["Europe/Stockholm"] },
  NO: { currency: "NOK", zones: ["Europe/Oslo"] },
  DK: { currency: "DKK", zones: ["Europe/Copenhagen"] },
  FI: { currency: "EUR", zones: ["Europe/Helsinki"] },
  PL: { currency: "PLN", zones: ["Europe/Warsaw"] },
  RO: { currency: "RON", zones: ["Europe/Bucharest"] },
  BG: { currency: "BGN", zones: ["Europe/Sofia"] },
  AL: { currency: "ALL", zones: ["Europe/Tirane"] },
  MK: { currency: "MKD", zones: ["Europe/Skopje"] },
  RS: { currency: "RSD", zones: ["Europe/Belgrade"] },
  HR: { currency: "EUR", zones: ["Europe/Zagreb"] },
  UA: { currency: "UAH", zones: ["Europe/Kyiv"] },
  RU: {
    currency: "RUB",
    zones: ["Europe/Moscow", "Europe/Samara", "Asia/Yekaterinburg", "Asia/Novosibirsk", "Asia/Krasnoyarsk", "Asia/Irkutsk", "Asia/Vladivostok"],
  },
  GE: { currency: "GEL", zones: ["Asia/Tbilisi"] },
  IL: { currency: "ILS", zones: ["Asia/Jerusalem"] },
  JO: { currency: "JOD", zones: ["Asia/Amman"] },
  LB: { currency: "LBP", zones: ["Asia/Beirut"] },
  IQ: { currency: "IQD", zones: ["Asia/Baghdad"] },
  IR: { currency: "IRR", zones: ["Asia/Tehran"] },
  PH: { currency: "PHP", zones: ["Asia/Manila"] },
  ID: { currency: "IDR", zones: ["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura"] },
  MY: { currency: "MYR", zones: ["Asia/Kuala_Lumpur"] },
  SG: { currency: "SGD", zones: ["Asia/Singapore"] },
  CN: { currency: "CNY", zones: ["Asia/Shanghai"] },
  JP: { currency: "JPY", zones: ["Asia/Tokyo"] },
  KR: { currency: "KRW", zones: ["Asia/Seoul"] },
  AU: {
    currency: "AUD",
    zones: ["Australia/Sydney", "Australia/Melbourne", "Australia/Brisbane", "Australia/Adelaide", "Australia/Darwin", "Australia/Perth", "Australia/Hobart"],
  },
  NZ: { currency: "NZD", zones: ["Pacific/Auckland"] },
  ZA: { currency: "ZAR", zones: ["Africa/Johannesburg"] },
  NG: { currency: "NGN", zones: ["Africa/Lagos"] },
  KE: { currency: "KES", zones: ["Africa/Nairobi"] },
  MA: { currency: "MAD", zones: ["Africa/Casablanca"] },
  DZ: { currency: "DZD", zones: ["Africa/Algiers"] },
  TN: { currency: "TND", zones: ["Africa/Tunis"] },
  BR: { currency: "BRL", zones: ["America/Sao_Paulo", "America/Manaus", "America/Fortaleza", "America/Noronha"] },
  MX: { currency: "MXN", zones: ["America/Mexico_City", "America/Cancun", "America/Tijuana", "America/Hermosillo"] },
  AR: { currency: "ARS", zones: ["America/Argentina/Buenos_Aires"] },
};

/** Countries offered in the business region picker (name order). */
export const REGION_COUNTRIES = COUNTRIES.filter(([iso]) => COUNTRY_REGION[iso])
  .map(([iso, name]) => ({ iso, name }))
  .sort((a, b) => a.name.localeCompare(b.name));

/** All currencies a service can be priced in (unique, sorted). */
export const CURRENCIES = Array.from(
  new Set([...Object.values(COUNTRY_REGION).map((r) => r.currency), "USD", "EUR", "GBP"]),
).sort();

/** Finds a country entry by stored value (name or ISO code). */
export const findRegionCountry = (country?: string | null) => {
  const c = (country ?? "").trim().toLowerCase();
  return REGION_COUNTRIES.find((x) => x.iso.toLowerCase() === c || x.name.toLowerCase() === c) ?? null;
};

/** Every IANA time zone the browser knows (fallback: the ones listed above). */
export const allTimeZones = (): string[] => {
  try {
    const fn = (Intl as any).supportedValuesOf;
    if (typeof fn === "function") return fn("timeZone") as string[];
  } catch {}
  return Array.from(new Set(Object.values(COUNTRY_REGION).flatMap((r) => r.zones))).sort();
};

/** "Asia/Karachi" -> "Karachi (GMT+5)" */
export const timeZoneLabel = (tz: string) => {
  const city = tz.split("/").pop()!.replace(/_/g, " ");
  try {
    const part = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset" })
      .formatToParts(new Date())
      .find((p) => p.type === "timeZoneName")?.value;
    return part ? `${city} (${part})` : city;
  } catch {
    return city;
  }
};

/**
 * Money from cents in any currency, e.g. formatMoney(2500, "PKR") -> "Rs 25.00"
 * (falls back to "25.00 XYZ" for unknown codes).
 */
export const formatMoney = (cents: number | null | undefined, currency?: string | null) => {
  const amount = (cents ?? 0) / 100;
  const code = (currency || "EUR").toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${code}`;
  }
};

/** Main cities per country for the City dropdown (any other city can be typed). */
export const COUNTRY_CITIES: Record<string, string[]> = {
  GR: ["Athens", "Thessaloniki", "Patras", "Heraklion", "Larissa", "Volos", "Ioannina", "Chania", "Rhodes"],
  CY: ["Nicosia", "Limassol", "Larnaca", "Paphos", "Famagusta"],
  PK: ["Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Peshawar", "Quetta", "Sialkot", "Gujranwala", "Hyderabad"],
  AE: ["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah", "Fujairah", "Al Ain"],
  QA: ["Doha", "Al Rayyan", "Al Wakrah", "Al Khor", "Lusail", "Umm Salal"],
  SA: ["Riyadh", "Jeddah", "Mecca", "Medina", "Dammam", "Khobar", "Taif", "Tabuk"],
  KW: ["Kuwait City", "Hawalli", "Salmiya", "Al Ahmadi", "Jahra"],
  BH: ["Manama", "Muharraq", "Riffa", "Isa Town"],
  OM: ["Muscat", "Salalah", "Sohar", "Nizwa", "Sur"],
  IN: ["Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Chennai", "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Lucknow"],
  BD: ["Dhaka", "Chittagong", "Khulna", "Sylhet", "Rajshahi"],
  LK: ["Colombo", "Kandy", "Galle", "Jaffna", "Negombo"],
  NP: ["Kathmandu", "Pokhara", "Lalitpur", "Biratnagar"],
  AF: ["Kabul", "Kandahar", "Herat", "Mazar-i-Sharif"],
  EG: ["Cairo", "Alexandria", "Giza", "Sharm El Sheikh", "Hurghada", "Luxor"],
  TR: ["Istanbul", "Ankara", "Izmir", "Antalya", "Bursa", "Adana"],
  GB: ["London", "Manchester", "Birmingham", "Glasgow", "Edinburgh", "Liverpool", "Leeds", "Bristol"],
  IE: ["Dublin", "Cork", "Galway", "Limerick", "Waterford"],
  US: ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia", "San Antonio", "San Diego", "Dallas", "Miami", "Seattle", "Atlanta"],
  CA: ["Toronto", "Montreal", "Vancouver", "Calgary", "Edmonton", "Ottawa", "Winnipeg", "Halifax"],
  DE: ["Berlin", "Hamburg", "Munich", "Cologne", "Frankfurt", "Stuttgart", "Düsseldorf"],
  FR: ["Paris", "Marseille", "Lyon", "Toulouse", "Nice", "Nantes", "Bordeaux"],
  IT: ["Rome", "Milan", "Naples", "Turin", "Florence", "Bologna", "Venice"],
  ES: ["Madrid", "Barcelona", "Valencia", "Seville", "Málaga", "Bilbao", "Las Palmas"],
  PT: ["Lisbon", "Porto", "Braga", "Faro", "Coimbra", "Funchal"],
  NL: ["Amsterdam", "Rotterdam", "The Hague", "Utrecht", "Eindhoven"],
  BE: ["Brussels", "Antwerp", "Ghent", "Bruges", "Liège"],
  CH: ["Zurich", "Geneva", "Basel", "Bern", "Lausanne"],
  AT: ["Vienna", "Graz", "Linz", "Salzburg", "Innsbruck"],
  SE: ["Stockholm", "Gothenburg", "Malmö", "Uppsala"],
  NO: ["Oslo", "Bergen", "Trondheim", "Stavanger"],
  DK: ["Copenhagen", "Aarhus", "Odense", "Aalborg"],
  FI: ["Helsinki", "Espoo", "Tampere", "Turku", "Oulu"],
  PL: ["Warsaw", "Kraków", "Łódź", "Wrocław", "Poznań", "Gdańsk"],
  RO: ["Bucharest", "Cluj-Napoca", "Timișoara", "Iași", "Constanța"],
  BG: ["Sofia", "Plovdiv", "Varna", "Burgas"],
  AL: ["Tirana", "Durrës", "Vlorë", "Shkodër"],
  MK: ["Skopje", "Bitola", "Ohrid", "Kumanovo"],
  RS: ["Belgrade", "Novi Sad", "Niš", "Kragujevac"],
  HR: ["Zagreb", "Split", "Rijeka", "Osijek", "Dubrovnik"],
  UA: ["Kyiv", "Kharkiv", "Odesa", "Lviv", "Dnipro"],
  RU: ["Moscow", "Saint Petersburg", "Novosibirsk", "Yekaterinburg", "Kazan"],
  GE: ["Tbilisi", "Batumi", "Kutaisi"],
  IL: ["Jerusalem", "Tel Aviv", "Haifa", "Eilat"],
  JO: ["Amman", "Zarqa", "Irbid", "Aqaba"],
  LB: ["Beirut", "Tripoli", "Sidon", "Jounieh"],
  IQ: ["Baghdad", "Basra", "Erbil", "Mosul", "Sulaymaniyah"],
  IR: ["Tehran", "Mashhad", "Isfahan", "Shiraz", "Tabriz"],
  PH: ["Manila", "Quezon City", "Cebu City", "Davao City", "Makati"],
  ID: ["Jakarta", "Surabaya", "Bandung", "Medan", "Bali (Denpasar)"],
  MY: ["Kuala Lumpur", "George Town", "Johor Bahru", "Ipoh", "Kota Kinabalu"],
  SG: ["Singapore"],
  CN: ["Beijing", "Shanghai", "Guangzhou", "Shenzhen", "Chengdu", "Hong Kong"],
  JP: ["Tokyo", "Osaka", "Yokohama", "Nagoya", "Kyoto", "Fukuoka"],
  KR: ["Seoul", "Busan", "Incheon", "Daegu"],
  AU: ["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide", "Canberra", "Gold Coast"],
  NZ: ["Auckland", "Wellington", "Christchurch", "Hamilton"],
  ZA: ["Johannesburg", "Cape Town", "Durban", "Pretoria"],
  NG: ["Lagos", "Abuja", "Kano", "Ibadan", "Port Harcourt"],
  KE: ["Nairobi", "Mombasa", "Kisumu", "Nakuru"],
  MA: ["Casablanca", "Rabat", "Marrakesh", "Fes", "Tangier"],
  DZ: ["Algiers", "Oran", "Constantine"],
  TN: ["Tunis", "Sfax", "Sousse"],
  BR: ["São Paulo", "Rio de Janeiro", "Brasília", "Salvador", "Fortaleza", "Belo Horizonte"],
  MX: ["Mexico City", "Guadalajara", "Monterrey", "Cancún", "Tijuana", "Puebla"],
  AR: ["Buenos Aires", "Córdoba", "Rosario", "Mendoza"],
};

/** Currency names for the currency dropdown search ("rupee", "dirham", ...). */
export const currencyName = (code: string) => {
  try {
    return new Intl.DisplayNames(["en"], { type: "currency" }).of(code) ?? code;
  } catch {
    return code;
  }
};
