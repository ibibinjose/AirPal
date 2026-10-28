import { useEffect, useRef, useState, type FormEvent } from "react";
import { collection, deleteDoc, doc, getDocs, onSnapshot, query, setDoc, where } from "firebase/firestore";
import { toast } from "sonner";
import { WifiOff } from "lucide-react";
import { guestEmailError, inviteMailto, normalizeEmail, type GuestEntry } from "@shared/club";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseDb } from "@/lib/firebase";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { fieldInput, fieldTextarea } from "@/components/forms/ValidField";

export function GuestListPanel({ clubId, clubName }: { clubId: string; clubName: string }) {
  const { user } = useAuth();
  const [rows, setRows] = useState<GuestEntry[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState(`${clubName} — you're on the list`);
  const [body, setBody] = useState(`Hi,\n\nYou're invited. Show this mail at the door.\n\n${clubName}\nvia AirPal.Me`);
  const [saving, setSaving] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [offline, setOffline] = useState(() => typeof navigator !== "undefined" && !navigator.onLine);
  const undoTimer = useRef<number | null>(null);

  useEffect(() => {
    setRows([]);
    if (!user) return;
    const db = getFirebaseDb();
    if (!db) {
      setOffline(true);
      toast.error("Guest lists need a server connection.");
      return;
    }
    setOffline(typeof navigator !== "undefined" && !navigator.onLine);
    return onSnapshot(
      collection(db, "users", user.uid, "businessGuestlists", clubId, "guests"),
      (snapshot) => {
        setOffline(false);
        setRows(
          snapshot.docs
            .map((row) => ({ ...(row.data() as Omit<GuestEntry, "id">), id: row.id }))
            .sort((a, b) => b.addedAt.localeCompare(a.addedAt)),
        );
      },
      () => {
        setOffline(true);
        toast.error("Could not load this guest list from the server.");
      },
    );
  }, [clubId, user?.uid]);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  useEffect(
    () => () => {
      if (undoTimer.current) window.clearTimeout(undoTimer.current);
    },
    [],
  );

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (!user) {
      toast.error("Sign in to save guests to your account.");
      return;
    }
    const problem = guestEmailError(email);
    if (problem) {
      toast.error(problem);
      return;
    }
    const db = getFirebaseDb();
    if (!db) {
      toast.error("Guest lists need a server connection.");
      return;
    }
    setSaving(true);
    try {
      const guests = collection(db, "users", user.uid, "businessGuestlists", clubId, "guests");
      const normalized = normalizeEmail(email);
      const existing = await getDocs(query(guests, where("email", "==", normalized)));
      if (!existing.empty) {
        toast.message("This guest is already on the list.");
        return;
      }
      const guestRef = doc(guests);
      await setDoc(guestRef, {
        id: guestRef.id,
        email: normalized,
        name: name.trim().slice(0, 80),
        note: "",
        source: "manual",
        addedAt: new Date().toISOString(),
      } satisfies Omit<GuestEntry, "id"> & { id: string });
      setName("");
      setEmail("");
      setSheetOpen(false);
      toast.success("Guest saved to your account.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save this guest to the server.");
    } finally {
      setSaving(false);
    }
  }

  async function onRemove(id: string) {
    if (!user) return;
    const db = getFirebaseDb();
    if (!db) {
      toast.error("Guest lists need a server connection.");
      return;
    }
    const removed = rows.find((row) => row.id === id);
    if (!removed) return;
    // Optimistic remove with a 5s undo window instead of a per-guest confirm.
    setRows((prev) => prev.filter((row) => row.id !== id));
    try {
      await deleteDoc(doc(db, "users", user.uid, "businessGuestlists", clubId, "guests", id));
      const restore = async () => {
        if (undoTimer.current) window.clearTimeout(undoTimer.current);
        const { id: rowId, ...data } = removed;
        setRows((prev) => [...prev, removed].sort((a, b) => b.addedAt.localeCompare(a.addedAt)));
        try {
          await setDoc(doc(db, "users", user.uid, "businessGuestlists", clubId, "guests", rowId), {
            ...data,
            id: rowId,
          });
        } catch {
          toast.error("Could not restore this guest.");
        }
      };
      toast.success("Guest removed.", {
        action: { label: "Undo", onClick: () => void restore() },
        duration: 5000,
      });
      undoTimer.current = window.setTimeout(() => {
        undoTimer.current = null;
      }, 5000);
    } catch (err) {
      setRows((prev) => [...prev, removed].sort((a, b) => b.addedAt.localeCompare(a.addedAt)));
      toast.error(err instanceof Error ? err.message : "Could not remove this guest from the server.");
    }
  }

  function onSend() {
    if (!rows.length) {
      toast.message("Add a guest before preparing an invite.");
      return;
    }
    const href = inviteMailto(
      rows.map((row) => row.email),
      subject,
      body,
    );
    window.location.href = href;
  }

  return (
    <div className="mt-5 space-y-5">
      {offline && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-2xl bg-amber-500/10 px-4 py-3 text-xs font-semibold text-amber-700 ring-1 ring-amber-500/25 dark:text-amber-300"
        >
          <WifiOff size={15} aria-hidden="true" />
          <span>Offline — showing the last saved list. Changes sync when you reconnect.</span>
        </p>
      )}

      <div className="flex items-center justify-between gap-3 rounded-3xl bg-card p-5 ring-1 ring-line">
        <div>
          <p className="font-display text-4xl tabular-nums">{rows.length}</p>
          <p className="text-sm text-mute">On the guest list · synced to your account</p>
        </div>
        <Button type="button" size="sm" className="h-11 shrink-0" onClick={() => setSheetOpen(true)}>
          Add walk-in
        </Button>
      </div>

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Add walk-in">
        <form className="space-y-3" onSubmit={(e) => void onAdd(e)}>
          <div>
            <label htmlFor="walkin-name" className="mb-1 block text-xs font-bold uppercase tracking-wider text-mute">
              Name
            </label>
            <input
              id="walkin-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              autoCapitalize="words"
              placeholder="Guest name"
              className="h-12 w-full rounded-2xl bg-paper px-4 text-base outline-none ring-1 ring-line focus:ring-2 focus:ring-brand"
            />
          </div>
          <div>
            <label htmlFor="walkin-email" className="mb-1 block text-xs font-bold uppercase tracking-wider text-mute">
              Email
            </label>
            <input
              id="walkin-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="guest@example.com"
              className="h-12 w-full rounded-2xl bg-paper px-4 text-base outline-none ring-1 ring-line focus:ring-2 focus:ring-brand"
            />
          </div>
          <Button type="submit" className="h-12 w-full" disabled={saving}>
            {saving ? "Saving…" : "Save to list"}
          </Button>
        </form>
      </Sheet>

      <ul className="space-y-2">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex min-h-[56px] items-center justify-between gap-3 rounded-2xl bg-card px-4 py-2.5 ring-1 ring-line"
          >
            <span className="min-w-0">
              <span className="block truncate font-medium">{row.name || row.email}</span>
              <span className="block truncate text-[12px] text-mute">{row.email}</span>
            </span>
            <button
              type="button"
              aria-label={`Remove ${row.name || row.email}`}
              className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full px-3 text-sm font-semibold text-mute transition hover:bg-paper hover:text-ink"
              onClick={() => void onRemove(row.id)}
            >
              Remove
            </button>
          </li>
        ))}
        {rows.length === 0 && (
          <li className="rounded-2xl border border-dashed border-line p-6 text-center">
            <p className="text-sm font-semibold text-ink">No guests yet</p>
            <p className="mt-1 text-xs text-mute">Add your first walk-in to start tonight&apos;s list.</p>
            <Button type="button" size="sm" className="mt-3 h-11" onClick={() => setSheetOpen(true)}>
              Add walk-in
            </Button>
          </li>
        )}
      </ul>

      <div className="space-y-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-accent">Email invite</p>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} className={fieldInput} />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} className={`h-32 ${fieldTextarea}`} />
        <Button className="w-full" onClick={onSend}>
          Open mail app
        </Button>
        <p className="text-[12px] text-mute">
          Opens your mail app with the server-synced list on BCC. AirPal does not send bulk mail from this panel.
        </p>
      </div>
    </div>
  );
}
