import { useState } from "react";
import { Megaphone } from "lucide-react";
import { toast } from "sonner";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { announceEventToGuestsRemote } from "@/lib/functions";

/**
 * Message guests: one announcement to everyone on the door list.
 * Sends through the server broadcast engine (inbox + push) — host-only.
 */
export function EventAnnounceModal({
  open,
  onClose,
  eventId,
  eventName,
}: {
  open: boolean;
  onClose: () => void;
  eventId: string;
  eventName: string;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (title.trim().length < 2 || body.trim().length < 2) {
      toast.error("Give the update a title and a message.");
      return;
    }
    setSending(true);
    try {
      const res = await announceEventToGuestsRemote({ eventId, title: title.trim(), body: body.trim() });
      toast.success(`Update sent to ${res.sent} guest${res.sent === 1 ? "" : "s"}.`);
      setTitle("");
      setBody("");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send the update.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Message guests">
      <div className="space-y-3.5">
        <p className="text-sm text-mute">
          One update to everyone going to <strong className="text-ink">{eventName}</strong>. Lands in their inbox, with
          a push where allowed.
        </p>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
            placeholder="Doors open early tonight"
            className="h-12 w-full rounded-2xl border border-line bg-paper px-4 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">Message</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={280}
            rows={4}
            placeholder="Doors now open at 6pm — see you at the front gate…"
            className="w-full rounded-2xl border border-line bg-paper p-3.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 resize-none"
          />
          <p className="mt-1 text-right text-[11px] text-mute">{body.length}/280</p>
        </div>
        <Button
          type="button"
          disabled={sending}
          onClick={() => void send()}
          className="h-12 w-full gap-1.5 rounded-full bg-brand font-semibold text-white hover:bg-brand-ink"
        >
          <Megaphone size={16} aria-hidden="true" />
          <span>{sending ? "Sending…" : "Send update"}</span>
        </Button>
      </div>
    </Sheet>
  );
}
