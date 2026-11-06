/**
 * Spreadsheet import helpers (Excel .xlsx or .csv). Everything is read in the browser;
 * only the cleaned rows are sent to the server.
 */
export type ImportKind = "customers" | "staff";

export interface ImportItem {
  row: number; // row number as seen in the sheet
  data: Record<string, string | null>;
  errors: string[];
}

export interface ImportPreview {
  items: ImportItem[];
  mapped: string[]; // sheet columns we understood
  ignored: string[]; // sheet columns we skipped (not relevant)
}

const norm = (v: unknown) => String(v ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

const ALIASES: Record<ImportKind, Record<string, string[]>> = {
  customers: {
    firstName: ["firstname", "first", "givenname", "forename", "fname"],
    lastName: ["lastname", "last", "surname", "familyname", "lname"],
    fullName: ["name", "fullname", "customer", "customername", "client", "clientname"],
    email: ["email", "emailaddress", "mail", "eaddress"],
    phone: ["phone", "phonenumber", "mobile", "mobilenumber", "cell", "cellphone", "tel", "telephone", "contact", "contactnumber", "whatsapp"],
    notes: ["notes", "note", "comments", "comment", "remarks"],
  },
  staff: {
    firstName: ["firstname", "first", "givenname", "forename", "fname"],
    lastName: ["lastname", "last", "surname", "familyname", "lname"],
    fullName: ["name", "fullname", "staff", "staffname", "employee", "employeename", "member"],
    email: ["email", "emailaddress", "mail", "eaddress"],
    phone: ["phone", "phonenumber", "mobile", "mobilenumber", "cell", "cellphone", "tel", "telephone", "contact", "contactnumber", "whatsapp"],
    role: ["role", "jobtitle", "title", "position", "designation", "job"],
    status: ["status", "active", "isactive"],
  },
};

const cellToString = (cell: unknown): string => {
  if (cell === null || cell === undefined) return "";
  if (cell instanceof Date) return cell.toISOString().slice(0, 10);
  if (typeof cell === "number") return Number.isInteger(cell) ? String(cell) : String(cell);
  return String(cell).trim();
};

/** Small CSV reader (handles quotes, commas and line breaks inside quotes). */
export const parseCsv = (text: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/^\uFEFF/, "");
  const delimiter = (src.split("\n")[0] ?? "").split(";").length > (src.split("\n")[0] ?? "").split(",").length ? ";" : ",";
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      rows.push(row); row = [];
    } else cell += ch;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows;
};

export const readSheetFile = async (file: File): Promise<string[][]> => {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv") || file.type === "text/csv") {
    return parseCsv(await file.text()).map((r) => r.map(cellToString));
  }
  if (!name.endsWith(".xlsx")) {
    throw new Error("Please choose an Excel (.xlsx) or CSV file. Older .xls files: open in Excel and Save As .xlsx.");
  }
  const { readSheet } = await import("read-excel-file/web-worker");
  const rows = (await readSheet(file)) as unknown[][];
  return rows.map((r) => r.map(cellToString));
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const digits = (v: string) => v.replace(/\D/g, "");

export const buildPreview = (rows: string[][], kind: ImportKind): ImportPreview => {
  const aliases = ALIASES[kind];
  // Header row = first row where at least one cell is a column we know.
  let headerIndex = -1;
  let columns: Record<string, number> = {};
  for (let r = 0; r < Math.min(rows.length, 15); r++) {
    const found: Record<string, number> = {};
    rows[r]!.forEach((cell, c) => {
      const key = norm(cell);
      if (!key) return;
      for (const [field, names] of Object.entries(aliases)) {
        if (!(field in found) && names.includes(key)) found[field] = c;
      }
    });
    if (Object.keys(found).length >= 2) { headerIndex = r; columns = found; break; }
  }
  if (headerIndex < 0) {
    throw new Error("Could not find a header row. The first row should have column names like Name, Email, Phone.");
  }

  const header = rows[headerIndex]!;
  const usedCols = new Set(Object.values(columns));
  const mapped = [...usedCols].map((c) => header[c] ?? "").filter(Boolean);
  const ignored = header.map((h, c) => (usedCols.has(c) ? "" : h)).filter(Boolean);

  const get = (row: string[], field: string) => (field in columns ? (row[columns[field]!] ?? "").trim() : "");

  const items: ImportItem[] = [];
  const seen = new Set<string>();

  for (let r = headerIndex + 1; r < rows.length; r++) {
    const row = rows[r]!;
    if (row.every((c) => !String(c ?? "").trim())) continue; // empty line

    let firstName = get(row, "firstName");
    let lastName = get(row, "lastName");
    const full = get(row, "fullName").replace(/,/g, " ").trim();
    if (!firstName && !lastName && full) {
      const parts = full.split(/\s+/);
      firstName = parts[0] ?? "";
      lastName = parts.slice(1).join(" ");
    }
    const email = get(row, "email").toLowerCase();
    const phone = get(row, "phone");
    const errors: string[] = [];

    if (email && !EMAIL_RE.test(email)) errors.push("Invalid email");

    const data: Record<string, string | null> = {};
    if (kind === "customers") {
      if (!firstName) errors.push("Missing name");
      if (!lastName) lastName = "-"; // the system needs a last name; a dash keeps single-name customers
      if (digits(phone).length < 5) errors.push("Missing or invalid phone");
      Object.assign(data, { firstName, lastName, email: email || null, phone, notes: get(row, "notes") || null });
    } else {
      const name = [firstName, lastName].filter(Boolean).join(" ").trim();
      if (name.length < 2) errors.push("Missing name");
      const status = norm(get(row, "status"));
      const inactive = ["inactive", "no", "false", "0", "disabled", "left"].includes(status);
      Object.assign(data, {
        name,
        email: email || null,
        phone: phone || null,
        role: get(row, "role") || "Staff",
        active: inactive ? "false" : "true",
      });
    }

    const key = email || digits(phone) || norm(data.name ?? "");
    if (!errors.length && key) {
      if (seen.has(key)) errors.push("Duplicate inside the file");
      seen.add(key);
    }
    items.push({ row: r + 1, data, errors });
  }
  return { items, mapped, ignored };
};

/** Downloads a ready-to-fill CSV template (opens in Excel). */
export const downloadTemplate = (kind: ImportKind) => {
  const csv =
    kind === "customers"
      ? "First Name,Last Name,Email,Phone,Notes\nMaria,Papadopoulou,maria@example.com,+306900000000,Prefers mornings\n"
      : "Name,Email,Phone,Role,Status\nNikos Georgiou,nikos@example.com,+306900000001,Barber,Active\n";
  const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${kind}-import-template.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
