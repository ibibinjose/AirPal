import { collection, onSnapshot, type Timestamp } from "firebase/firestore";
import type { StaffTicket, TicketPriority } from "@shared/airpal-data";
export type { StaffTicket } from "@shared/airpal-data";
import { getFirebaseDb } from "./firebase";
import { liveBackendEnabled } from "./functions";

const LOCAL_PREFIX = "airpal.tickets.";

/** Priority rules for staff tickets (web copy — kept here so `@shared/airpal-data` stays out of the initial bundle; mirrored there for Cloud Functions — keep in sync). */
export function resolveTicketPriority(ticket: {
  priority?: TicketPriority;
  urgency?: "normal" | "urgent";
  category?: StaffTicket["category"] | string;
  details?: string;
}): TicketPriority {
  if (ticket.priority) return ticket.priority;
  if (ticket.urgency === "urgent") return "urgent";
  if (ticket.category === "maintenance") return "high";
  if (ticket.category === "late_checkout" || ticket.category === "dining") return "medium";
  if (ticket.category === "reception") return "medium";
  return "low";
}

function asIso(value: unknown): string {
  if (typeof value === "string" && value) return value;
  if (value && typeof value === "object" && "toDate" in value && typeof (value as Timestamp).toDate === "function") {
    return (value as Timestamp).toDate().toISOString();
  }
  return "";
}

export function ticketFromDoc(id: string, data: Record<string, unknown>): StaffTicket | null {
  const details = typeof data.details === "string" ? data.details.trim() : "";
  if (!details) return null;
  const category = data.category;
  const allowed = ["reception", "housekeeping", "maintenance", "dining", "late_checkout"] as const;
  const cat = allowed.includes(category as (typeof allowed)[number])
    ? (category as StaffTicket["category"])
    : "reception";
  const urgency = data.urgency === "urgent" ? "urgent" : "normal";
  const status = data.status === "resolved" || data.status === "in_progress" ? data.status : "pending";
  const ticket: StaffTicket = {
    id,
    propertyId: typeof data.propertyId === "string" ? data.propertyId : undefined,
    roomNumber: typeof data.roomNumber === "string" ? data.roomNumber : "Guest",
    guestName: typeof data.guestName === "string" ? data.guestName : "Guest",
    category: cat,
    details,
    status,
    createdAt: asIso(data.createdAt) || asIso(data.createdAtIso) || new Date().toISOString(),
    urgency,
    resolvedBy: typeof data.resolvedBy === "string" ? data.resolvedBy : undefined,
    resolvedAt: asIso(data.resolvedAt) || undefined,
  };
  ticket.priority = resolveTicketPriority(ticket);
  return ticket;
}

export function categoryFromGuestText(text: string): StaffTicket["category"] {
  const q = text.toLowerCase();
  if (/late\s*(out|checkout|check-out)/.test(q)) return "late_checkout";
  if (/towel|pillow|blanket|housekeep|clean|linen/.test(q)) return "housekeeping";
  if (/ac|air.?con|plumb|leak|broken|maintenance|light|tv/.test(q)) return "maintenance";
  if (/breakfast|dinner|menu|hungry|dining/.test(q)) return "dining";
  return "reception";
}

function readLocal(propertyId: string): StaffTicket[] {
  try {
    const raw = localStorage.getItem(LOCAL_PREFIX + propertyId);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((row) => row && typeof row.details === "string") : [];
  } catch {
    return [];
  }
}

function writeLocal(propertyId: string, tickets: StaffTicket[]) {
  try {
    localStorage.setItem(LOCAL_PREFIX + propertyId, JSON.stringify(tickets.slice(0, 40)));
  } catch {
    /* ignore */
  }
}

export type SubmitTicketInput = {
  propertyId: string;
  details: string;
  roomNumber?: string;
  category?: StaffTicket["category"];
  urgency?: StaffTicket["urgency"];
};

/** Live host inbox. Remote snapshot replaces local cache when Firebase is up. */
export function subscribePropertyTickets(propertyId: string, onChange: (tickets: StaffTicket[]) => void): () => void {
  if (!propertyId || propertyId === "unknown") {
    onChange([]);
    return () => undefined;
  }
  const db = getFirebaseDb();
  if (!db || !liveBackendEnabled()) {
    onChange(readLocal(propertyId));
    return () => undefined;
  }
  return onSnapshot(
    collection(db, "properties", propertyId, "tickets"),
    (snap) => {
      const rows: StaffTicket[] = [];
      for (const row of snap.docs) {
        const ticket = ticketFromDoc(row.id, row.data() as Record<string, unknown>);
        if (ticket) rows.push(ticket);
      }
      rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      writeLocal(propertyId, rows);
      onChange(rows);
    },
    () => {
      onChange(readLocal(propertyId));
    },
  );
}

export function openTicketCount(tickets: StaffTicket[]) {
  return tickets.filter((t) => t.status !== "resolved").length;
}
