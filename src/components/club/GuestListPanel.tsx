import { useEffect, useState, type FormEvent } from "react";
import { collection, deleteDoc, doc, getDocs, onSnapshot, query, setDoc, where } from "firebase/firestore";
import { toast } from "sonner";
import { inviteMailto, isEmail, normalizeEmail, type GuestEntry } from "@shared/club";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseDb } from "@/lib/firebase";
import { Button } from "@/components/ui/Button";
import { fieldInput, fieldTextarea } from "@/components/forms/ValidField";

export function GuestListPanel({ clubId, clubName }: { clubId: string; clubName: string }) {
  const { user } = useAuth();
  const [rows, setRows] = useState<GuestEntry[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState(`${clubName} — you're on the list`);
  const [body, setBody] = useState(`Hi,\n\nYou're invited. Show this mail at the door.\n\n${clubName}\nvia AirPal.Me`);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRows([]);
    if (!user) return;
    const db = getFirebaseDb();
    if (!db) {
      toast.error("Guest lists need a server connection.");
      return;
    }
    return onSnapshot(
      collection(db, "users", user.uid, "businessGuestlists", clubId, "guests"),
      (snapshot) =>
        setRows(
          snapshot.docs
            .map((row) => ({ ...(row.data() as Omit<GuestEntry, "id">), id: row.id }))
            .sort((a, b) => b.addedAt.localeCompare(a.addedAt)),
        ),
      () => toast.error("Could not load this guest list from the server."),
    );
  }, [clubId, user?.uid]);

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (!user) {
      toast.error("Sign in to save guests to your account.");
      return;
    }
    if (!isEmail(email)) {
      toast.error("Enter a valid email address.");
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
    try {
      await deleteDoc(doc(db, "users", user.uid, "businessGuestlists", clubId, "guests", id));
      toast.success("Guest removed.");
    } catch (err) {
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
      <div className="rounded-3xl bg-card p-5 ring-1 ring-line">
        <p className="font-display text-4xl">{rows.length}</p>
        <p className="text-sm text-mute">On the guest list · synced to your account</p>
      </div>

      <form className="space-y-2" onSubmit={(e) => void onAdd(e)}>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            autoCapitalize="words"
            placeholder="Name"
            aria-label="Guest name"
            className="h-11 min-w-0 flex-1 rounded-full bg-card px-4 border border-line outline-none focus:border-brand focus-visible:ring-2 focus-visible:ring-brand/60"
          />
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            aria-label="Guest email"
            className="h-11 min-w-0 flex-1 rounded-full bg-card px-4 border border-line outline-none focus:border-brand focus-visible:ring-2 focus-visible:ring-brand/60"
          />
        </div>
        <Button type="submit" size="sm" className="h-11" disabled={saving}>
          {saving ? "Saving…" : "Add guest"}
        </Button>
      </form>

      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.id} className="flex items-center justify-between rounded-2xl bg-card px-4 py-3 ring-1 ring-line">
            <span>
              <span className="block font-medium">{row.name || row.email}</span>
              <span className="text-[12px] text-mute">{row.email}</span>
            </span>
            <button type="button" className="text-sm text-mute" onClick={() => void onRemove(row.id)}>
              Remove
            </button>
          </li>
        ))}
        {rows.length === 0 && <p className="text-sm text-mute">No guests saved yet.</p>}
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
