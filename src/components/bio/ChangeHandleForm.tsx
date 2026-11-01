import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { handleError, normalizeHandle } from "@shared/bio";
import { Button } from "@/components/ui/Button";
import { useBio } from "@/contexts/BioContext";

export function ChangeHandleForm({
  current,
  profileId,
  compact,
}: {
  current: string;
  profileId?: string;
  compact?: boolean;
}) {
  const { transferHandle, handleFree } = useBio();
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const h = normalizeHandle(next);
    const err = handleError(h);
    if (err) {
      toast.error(err);
      return;
    }
    if (h === current) {
      toast.message(`You already use @${current}`);
      return;
    }
    setBusy(true);
    try {
      const free = await handleFree(h, profileId);
      if (!free.ok) throw new Error(free.reason || "Taken");
      const saved = await transferHandle(current, h);
      setNext("");
      setHint("");
      toast.success(`Your handle is @${saved}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not change handle");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className={compact ? "space-y-2.5" : "space-y-3"}>
      {!compact && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-accent">Public @handle</p>
          <p className="text-xs sm:text-sm text-mute mt-1 leading-relaxed">
            Current: <span className="font-semibold text-ink">@{current}</span>. Changing it updates your public bio URL
            and QR pass. Old links to the previous handle stop working.
          </p>
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="neu-inset flex flex-1 items-center overflow-hidden rounded-2xl bg-paper ring-1 ring-line focus-within:ring-2 focus-within:ring-brand">
          <span className="shrink-0 pl-3.5 pr-1 text-sm font-bold text-accent">@</span>
          <input
            value={next}
            onChange={(e) => {
              const h = normalizeHandle(e.target.value);
              setNext(h);
              setHint("");
              if (h && h !== current) {
                void handleFree(h, profileId).then((r) => setHint(r.ok ? "Available" : r.reason || "Taken"));
              }
            }}
            placeholder="newhandle"
            autoComplete="off"
            autoCapitalize="none"
            aria-label="New handle"
            className="h-11 min-h-[44px] min-w-0 flex-1 bg-transparent pr-3 text-sm font-medium text-ink outline-none"
          />
        </div>
        <Button
          type="submit"
          variant={compact ? "ghost" : "primary"}
          className="min-h-[44px] shrink-0 rounded-2xl px-5 text-xs font-bold sm:w-auto w-full"
          disabled={busy || !next || next.length < 3 || Boolean(handleError(next)) || next === current}
        >
          {busy ? "Saving…" : "Change @handle"}
        </Button>
      </div>
      {hint && (
        <p
          className={`text-xs font-semibold ${hint === "Available" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
        >
          {hint === "Available" ? `✓ @${next} is available` : hint}
        </p>
      )}
    </form>
  );
}
