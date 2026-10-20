import { safeLocalStorage } from "./safe-storage";
import { isNativeApp } from "./platform";
import { Share } from "@capacitor/share";
import { toast } from "sonner";

export type PersonMet = {
  id: string;
  /** AirPal @handle without the @, when they have a bio. */
  handle?: string;
  name: string;
  photo?: string;
  whereMet?: string;
  metAt: string;
};

const KEY = "airpal:people:v1";

function clean(row: unknown): PersonMet | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Partial<PersonMet>;
  if (typeof r.name !== "string" || !r.name.trim()) return null;
  return {
    id: typeof r.id === "string" && r.id ? r.id : `p-${Date.now()}`,
    handle:
      typeof r.handle === "string" && r.handle.trim() ? r.handle.trim().replace(/^@/, "").toLowerCase() : undefined,
    name: r.name.trim(),
    photo: typeof r.photo === "string" && r.photo ? r.photo : undefined,
    whereMet: typeof r.whereMet === "string" && r.whereMet.trim() ? r.whereMet.trim() : undefined,
    metAt: typeof r.metAt === "string" && r.metAt ? r.metAt : new Date().toISOString(),
  };
}

export function listPeople(): PersonMet[] {
  try {
    const raw = safeLocalStorage()?.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(clean).filter((p): p is PersonMet => p !== null);
  } catch {
    return [];
  }
}

let persistHook: (() => void) | null = null;

/** Called after every local write (used to mirror to Firebase when signed in). */
export function setPeoplePersistHook(fn: (() => void) | null): void {
  persistHook = fn;
}

function persist(people: PersonMet[]): void {
  try {
    safeLocalStorage()?.setItem(KEY, JSON.stringify(people));
  } catch {
    /* private mode: best-effort */
  }
  persistHook?.();
}

function newPersonId(): string {
  try {
    return `p-${crypto.randomUUID()}`;
  } catch {
    return `p-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  }
}

/** Insert or merge by handle (fallback: id). Returns the saved row. */
export function upsertPerson(input: Omit<PersonMet, "id" | "metAt"> & { id?: string; metAt?: string }): PersonMet {
  const people = listPeople();
  const handle = input.handle?.trim().replace(/^@/, "").toLowerCase() || undefined;
  const idx = people.findIndex((p) => (handle ? p.handle === handle : input.id != null && p.id === input.id));
  if (idx >= 0) {
    const next: PersonMet = {
      ...people[idx],
      name: input.name.trim() || people[idx].name,
      handle: handle ?? people[idx].handle,
      photo: input.photo ?? people[idx].photo,
      whereMet: input.whereMet ?? people[idx].whereMet,
    };
    people[idx] = next;
    persist(people);
    return next;
  }
  const row: PersonMet = {
    id: input.id || newPersonId(),
    handle,
    name: input.name.trim(),
    photo: input.photo,
    whereMet: input.whereMet?.trim() || undefined,
    metAt: input.metAt || new Date().toISOString(),
  };
  persist([row, ...people]);
  return row;
}

/** Replace the whole list (used when merging the Firebase mirror on login). */
export function replacePeople(rows: PersonMet[]): void {
  persist(
    rows
      .map(clean)
      .filter((r): r is PersonMet => r !== null)
      .filter((r, i, all) => all.findIndex((o) => o.id === r.id) === i),
  );
}

export function removePerson(id: string): void {
  persist(listPeople().filter((p) => p.id !== id));
}

export type VCardInput = {
  name: string;
  phone?: string;
  email?: string;
  url?: string;
  note?: string;
  photoUrl?: string;
};

function escapeVCard(value: string): string {
  // Prevent CRLF injection by replacing raw newlines with literal '\n' and escaping special chars
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

/** Secure RFC 6350 vCard 3.0 — opens directly in iOS/Android Contacts. */
export function buildVCard(input: VCardInput): string {
  const lines = ["BEGIN:VCARD", "VERSION:3.0"];
  const name = input.name.trim() || "AirPal contact";
  const parts = name.split(/\s+/);
  const last = parts.length > 1 ? parts[parts.length - 1] : "";
  const first = parts.length > 1 ? parts.slice(0, -1).join(" ") : name;
  lines.push(`N:${escapeVCard(last)};${escapeVCard(first)};;;`);
  lines.push(`FN:${escapeVCard(name)}`);
  if (input.phone?.trim()) lines.push(`TEL;TYPE=CELL:${escapeVCard(input.phone.trim())}`);
  if (input.email?.trim()) lines.push(`EMAIL:${escapeVCard(input.email.trim())}`);
  if (input.url?.trim()) lines.push(`URL:${escapeVCard(input.url.trim())}`);
  // vCard 3.0 photo by reference — remote portraits only, never data blobs.
  if (input.photoUrl?.trim() && /^https?:\/\//i.test(input.photoUrl.trim())) {
    lines.push(`PHOTO;VALUE=URI:${escapeVCard(input.photoUrl.trim())}`);
  }
  if (input.note?.trim()) lines.push(`NOTE:${escapeVCard(input.note.trim())}`);
  lines.push("END:VCARD");
  return lines.join("\r\n");
}

function downloadVCard(input: VCardInput): void {
  if (typeof document === "undefined") {
    return;
  }
  const vcardText = buildVCard(input);
  const fileName = `${
    input.name
      .trim()
      .replace(/[^\w\- ]+/g, "")
      .replace(/\s+/g, "-") || "AirPal-Contact"
  }.vcf`;
  const blob = new Blob([vcardText], { type: "text/vcard;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/**
 * Opens a contact card in the device's Contacts application or shares it via native share sheet.
 * On iOS and Android:
 * 1. In Capacitor native apps: invokes native Share.share() so the OS contacts/share picker opens immediately.
 * 2. On iOS WebKit (Mobile Safari / Chrome on iOS): direct data URI navigation launches the native iOS Contacts app sheet directly without downloading a file.
 * 3. Uses navigator.share() with a vCard File instance if supported (prompts native Contacts "Add to Contacts").
 * 4. On Android mobile: opens vCard blob to trigger Android Contacts app intent.
 * 5. On desktop / fallback: downloads the .vcf file.
 */
export async function openVCardContact(input: VCardInput): Promise<"contact" | "shared" | "download"> {
  const vcardText = buildVCard(input);
  const fileName = `${
    input.name
      .trim()
      .replace(/[^\w\- ]+/g, "")
      .replace(/\s+/g, "-") || "AirPal-Contact"
  }.vcf`;

  const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
  const isIOS =
    typeof navigator !== "undefined" &&
    (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
  const isAndroid = /Android/i.test(ua);

  // 1. In Capacitor native iOS / Android app, use native Share to prompt native contact saving/sharing
  if (isNativeApp()) {
    try {
      await Share.share({
        title: input.name,
        text: `Contact for ${input.name}${input.phone ? ` (${input.phone})` : ""}${input.url ? ` · ${input.url}` : ""}`,
        url: input.url,
        dialogTitle: `Add ${input.name} to Contacts`,
      });
      return "shared";
    } catch {
      /* user dismissed sheet */
      return "shared";
    }
  }

  // 2. On iOS WebKit (Safari / Chrome on iOS): direct data URI navigation launches the native iOS Contacts app sheet directly without downloading
  if (isIOS && typeof window !== "undefined") {
    try {
      const dataUri = `data:text/vcard;charset=utf-8,${encodeURIComponent(vcardText)}`;
      window.location.href = dataUri;
      return "contact";
    } catch {
      /* fallback */
    }
  }

  // 3. Try Web Share API with a vCard File (supported by Android Chrome and modern browsers)
  // This opens the native Contacts import ("Create New Contact" / "Add to Contacts") sheet.
  if (typeof navigator !== "undefined" && typeof File !== "undefined") {
    try {
      const mimeType = isAndroid ? "text/x-vcard;charset=utf-8" : "text/vcard;charset=utf-8";
      const file = new File([vcardText], fileName, { type: mimeType });
      if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: input.name,
          text: `Contact for ${input.name}`,
          files: [file],
        });
        return "shared";
      }
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return "shared";
    }
  }

  // 4. On Android mobile if share failed: open vCard blob URL directly to trigger Android Contacts intent
  if (isAndroid && typeof window !== "undefined") {
    try {
      const blob = new Blob([vcardText], { type: "text/x-vcard;charset=utf-8" });
      const blobUrl = URL.createObjectURL(blob);
      const w = window.open(blobUrl, "_blank");
      if (w) {
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
        return "contact";
      }
    } catch {
      /* fallback */
    }
  }

  // 5. Desktop / fallback browser: download .vcf file
  downloadVCard(input);
  return "download";
}

export interface SaveBioContactInput {
  name: string;
  handle: string;
  phone?: string;
  email?: string;
  url?: string;
  headline?: string;
  city?: string;
  avatar?: string;
  note?: string;
}

/**
 * Universal helper to save or share a member's contact card with instant user feedback.
 */
export async function saveBioContact(input: SaveBioContactInput): Promise<"contact" | "shared" | "download"> {
  const cleanHandle = input.handle.trim().replace(/^@+/, "").toLowerCase();
  const res = await openVCardContact({
    name: input.name || `@${cleanHandle}`,
    phone: input.phone,
    email: input.email,
    url: input.url,
    photoUrl: input.avatar,
    note:
      input.note ||
      `AirPal Digital Bio Pass (@${cleanHandle})${input.headline ? ` · ${input.headline}` : ""}${input.city ? ` · ${input.city}` : ""}`,
  });
  if (res === "contact" || res === "shared") {
    toast.success("Opening Contact…");
  } else {
    toast.success("Contact card saved");
  }
  return res;
}
