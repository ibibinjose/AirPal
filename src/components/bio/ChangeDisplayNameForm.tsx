import { useState, type FormEvent } from "react";
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
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);

  const activeName = currentName || mine?.name || user?.displayName || "";

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

      setNext("");
      toast.success(`Display name updated to "${trimmed}"`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update display name");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className={compact ? "space-y-2" : "space-y-3"}>
      {!compact && (
        <>
          <p className="text-xs font-bold uppercase tracking-wider text-accent">Display Name</p>
          <p className="text-sm text-mute">
            Current: <span className="font-semibold text-ink">{activeName || "Not set"}</span>. This is the name shown
            on your profile card, tickets, and messages.
          </p>
        </>
      )}
      <div className="flex items-center overflow-hidden rounded-2xl bg-paper ring-1 ring-line focus-within:ring-2 focus-within:ring-ink">
        <input
          value={next}
          onChange={(e) => setNext(e.target.value)}
          placeholder={activeName || "Your Full Name"}
          autoComplete="name"
          maxLength={60}
          className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
        />
      </div>
      <Button
        type="submit"
        variant={compact ? "ghost" : "primary"}
        className="w-full border border-line"
        disabled={busy || !next.trim() || next.trim() === activeName}
      >
        {busy ? "Saving…" : "Update Name"}
      </Button>
    </form>
  );
}
