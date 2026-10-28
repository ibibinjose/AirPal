export const AIRPAL_CLUB_ID = "airpal";

export type ClubMember = {
  id: string;
  email: string;
  name: string;
  city: string;
  invites: boolean;
  offers: boolean;
  joinedAt: string;
};

export type GuestEntry = {
  id: string;
  email: string;
  name: string;
  note: string;
  source: "manual" | "airpal-club" | "bio";
  addedAt: string;
};

export type ClubInvite = {
  id: string;
  clubId: string;
  subject: string;
  body: string;
  emails: string[];
  sentAt: string;
};

export function isEmail(raw: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim().toLowerCase());
}

export function normalizeEmail(raw: string) {
  return raw.trim().toLowerCase();
}

/** Walk-in form guard: empty taps used to fail silently or toast-only. */
export function guestEmailError(raw: string): string | null {
  if (!raw.trim()) return "Enter the guest's email first.";
  if (!isEmail(raw)) return "That email doesn't look right — check it and try again.";
  return null;
}

export function inviteMailto(emails: string[], subject: string, body: string) {
  const list = emails.map(normalizeEmail).filter(isEmail);
  const first = list[0] || "";
  const bcc = list.slice(1).join(",");
  const q = [
    bcc ? `bcc=${encodeURIComponent(bcc)}` : "",
    `subject=${encodeURIComponent(subject)}`,
    `body=${encodeURIComponent(body)}`,
  ]
    .filter(Boolean)
    .join("&");
  return `mailto:${encodeURIComponent(first)}?${q}`;
}
