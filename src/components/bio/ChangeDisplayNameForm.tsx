import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { doc, setDoc } from "firebase/firestore";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";
import { setAuthDisplayName } from "@/lib/auth-mail";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";

export function ChangeDisplayNameForm({ currentName, compact }: { currentName?: string; compact?: boolean }) {
  const { user, refreshUser } = useAuth();
  const { mine, updateProfile } = useBio();
  const activeName = currentName || mine?.name || user?.displayName || "";
  const [next, setNext] = useState(activeName);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!touched && activeName) {
      setNext(activeName);
    }
  }, [activeName, touched]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = next.trim();
    if (!trimmed) {
      toast.error("Please enter a name");
      return;
    }
    if (trimmed === activeName) {
      toast.message("Name is already set to this");
      return;
    }
    setBusy(true);
    try {
      // 1. Update Firebase Auth displayName
      const auth = getFirebaseAuth();
      if (auth?.currentUser) {
        await setAuthDisplayName(auth.currentUser, trimmed);
      }

      // 2. Update Firestore users collection
      const db = getFirebaseDb();
      if (db && auth?.currentUser?.uid) {
        await setDoc(doc(db, "users", auth.currentUser.uid), { displayName: trimmed }, { merge: true });
      }

      // 3. Update Bio profile if exists
      if (mine?.handle) {
        await updateProfile({ handle: mine.handle, name: trimmed });
      }

      // 4. Refresh Auth Context state
      await refreshUser();

      setTouched(false);
      setNext(trimmed);
      toast.success(`Display name updated to "${trimmed}"`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update display name");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className={compact ? "space-y-2.5" : "space-y-3"}>
      {!compact && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-accent">Display Name</p>
          <p className="text-xs sm:text-sm text-mute mt-1 leading-relaxed">
            Current: <span className="font-semibold text-ink">{activeName || "Not set"}</span>. Shown on your profile
            card, tickets, and catch-up requests.
          </p>
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="neu-inset flex flex-1 items-center rounded-2xl bg-paper px-3 ring-1 ring-line focus-within:ring-2 focus-within:ring-brand">
          <input
            value={next}
            onChange={(e) => {
              setNext(e.target.value);
              setTouched(true);
            }}
            onBlur={() => setTouched(true)}
            placeholder={activeName || "Your Full Name"}
            autoComplete="name"
            maxLength={60}
            aria-label="Display Name"
            className="h-11 min-h-[44px] min-w-0 flex-1 bg-transparent text-sm font-medium text-ink outline-none"
          />
        </div>
        <Button
          type="submit"
          variant={compact ? "ghost" : "primary"}
          className="min-h-[44px] shrink-0 rounded-2xl px-5 text-xs font-bold sm:w-auto w-full"
          disabled={busy || !next.trim() || next.trim() === activeName}
        >
          {busy ? "Saving…" : "Update Name"}
        </Button>
      </div>
      {touched && !next.trim() && (
        <p role="alert" className="text-xs font-semibold text-rose-600 dark:text-rose-400">
          Please enter a display name
        </p>
      )}
    </form>
  );
}
