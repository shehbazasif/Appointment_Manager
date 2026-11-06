/** Country list for the phone-number picker: [ISO code, name, dial code]. */
export const COUNTRIES: [string, string, string][] = [
  ["GR", "Greece", "30"], ["CY", "Cyprus", "357"], ["PK", "Pakistan", "92"], ["AE", "United Arab Emirates", "971"],
  ["QA", "Qatar", "974"], ["SA", "Saudi Arabia", "966"], ["KW", "Kuwait", "965"], ["BH", "Bahrain", "973"],
  ["OM", "Oman", "968"], ["IN", "India", "91"], ["BD", "Bangladesh", "880"], ["LK", "Sri Lanka", "94"],
  ["NP", "Nepal", "977"], ["AF", "Afghanistan", "93"], ["EG", "Egypt", "20"], ["TR", "Turkey", "90"],
  ["GB", "United Kingdom", "44"], ["IE", "Ireland", "353"], ["US", "United States", "1"], ["CA", "Canada", "1"],
  ["DE", "Germany", "49"], ["FR", "France", "33"], ["IT", "Italy", "39"], ["ES", "Spain", "34"],
  ["PT", "Portugal", "351"], ["NL", "Netherlands", "31"], ["BE", "Belgium", "32"], ["CH", "Switzerland", "41"],
  ["AT", "Austria", "43"], ["SE", "Sweden", "46"], ["NO", "Norway", "47"], ["DK", "Denmark", "45"],
  ["FI", "Finland", "358"], ["PL", "Poland", "48"], ["RO", "Romania", "40"], ["BG", "Bulgaria", "359"],
  ["AL", "Albania", "355"], ["MK", "North Macedonia", "389"], ["RS", "Serbia", "381"], ["HR", "Croatia", "385"],
  ["UA", "Ukraine", "380"], ["RU", "Russia", "7"], ["GE", "Georgia", "995"], ["IL", "Israel", "972"],
  ["JO", "Jordan", "962"], ["LB", "Lebanon", "961"], ["IQ", "Iraq", "964"], ["IR", "Iran", "98"],
  ["PH", "Philippines", "63"], ["ID", "Indonesia", "62"], ["MY", "Malaysia", "60"], ["SG", "Singapore", "65"],
  ["CN", "China", "86"], ["JP", "Japan", "81"], ["KR", "South Korea", "82"], ["AU", "Australia", "61"],
  ["NZ", "New Zealand", "64"], ["ZA", "South Africa", "27"], ["NG", "Nigeria", "234"], ["KE", "Kenya", "254"],
  ["MA", "Morocco", "212"], ["DZ", "Algeria", "213"], ["TN", "Tunisia", "216"], ["BR", "Brazil", "55"],
  ["MX", "Mexico", "52"], ["AR", "Argentina", "54"],
];

/** Flag emoji from the ISO code (plain text characters, no images). */
export const flagOf = (iso: string) =>
  iso.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));

/** Picks the entry matching a business's country (name or ISO code); Greece by default. */
export const countryIndexFor = (country?: string | null) => {
  const c = (country ?? "").trim().toLowerCase();
  const i = COUNTRIES.findIndex(([iso, name]) => iso.toLowerCase() === c || name.toLowerCase() === c);
  return i >= 0 ? i : 0;
};

/** Keeps digits only and drops a leading 0 (07xx... -> 7xx...), as international numbers do. */
export const nationalDigits = (value: string) => value.replace(/\D/g, "").replace(/^0+/, "");

export const isValidPhoneParts = (dial: string, national: string) =>
  national.length >= 6 && dial.length + national.length <= 15;
