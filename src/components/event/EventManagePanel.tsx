import { useState } from "react";
import { Link, useLocation } from "wouter";
import { CalendarArrowDown, Copy, Mail, ScanLine, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { useEvents } from "@/contexts/EventsContext";
import { EventShareModal } from "@/components/event/EventShareModal";
import { downloadIcs } from "@/lib/calendar-export";
import type { EventRecord } from "@shared/event";
import { Button } from "@/components/ui/Button";

/**
 * Day-of operations for one event: guestlist, door scanner, invites,
 * calendar export, clone, and cancel. Every action hits a real surface —
 * no local-only coupons, no simulated blasts, no placeholder numbers.
 */
export function EventManagePanel({ event }: { event: EventRecord }) {
  const [, nav] = useLocation();
  const { upsertEvent } = useEvents();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [working, setWorking] = useState<"clone" | "cancel" | null>(null);

  const exportIcs = () => {
    downloadIcs({
      id: event.id,
      title: event.name,
      startsAt: event.startsAt,
      endsAt: event.endsAt || event.startsAt,
      venue: event.venue || "",
      city: event.city || "",
      description: event.description || event.shortWhy || "",
    });
    toast.success("Event calendar (.ics) exported");
  };

  const cloneEvent = async () => {
    setWorking("clone");
    try {
      const cloned = await upsertEvent({
        name: `${event.name} (Copy)`,
        flavour: event.flavour,
        shortWhy: event.shortWhy || undefined,
        description: event.description || undefined,
        venue: event.venue || undefined,
        city: event.city || "Sydney",
        address: event.address || undefined,
        capacity: event.capacity || 100,
        ticketPriceCents: event.ticketPriceCents || 0,
        requireApproval: event.requireApproval,
        status: "draft",
      });
      toast.success("Event cloned as draft");
      nav(`/e/${cloned.id}/manage`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn’t clone event");
    } finally {
      setWorking(null);
    }
  };

  const cancelEvent = async () => {
    setWorking("cancel");
    try {
      await upsertEvent({ id: event.id, name: event.name, flavour: event.flavour, status: "ended" });
      toast.success("Event cancelled");
      setConfirmingCancel(false);
      nav("/events");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn’t cancel event");
    } finally {
      setWorking(null);
    }
  };

  return (
    <div className="mt-5 space-y-4">
      <div className="rounded-3xl bg-card p-5 ring-1 ring-line shadow-clay">
        <h2 className="font-display text-lg font-bold text-ink">Run the day</h2>
        <p className="mt-0.5 text-xs text-mute">Doors, guests, and invites — everything live.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Link
            href={`/e/${event.id}/guests`}
            className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-2xl bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-ink active:scale-95"
          >
            <Users size={16} aria-hidden="true" />
            <span>Open guestlist</span>
          </Link>
          <Link
            href="/scan"
            className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-2xl px-4 text-sm font-semibold text-ink ring-1 ring-line transition hover:bg-paper active:scale-95"
          >
            <ScanLine size={16} aria-hidden="true" />
            <span>Door scanner</span>
          </Link>
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="inline-flex min-h-[48px] cursor-pointer items-center justify-center gap-1.5 rounded-2xl px-4 text-sm font-semibold text-ink ring-1 ring-line transition hover:bg-paper active:scale-95"
          >
            <Mail size={16} aria-hidden="true" />
            <span>Invite guests</span>
          </button>
          <button
            type="button"
            onClick={exportIcs}
            className="inline-flex min-h-[48px] cursor-pointer items-center justify-center gap-1.5 rounded-2xl px-4 text-sm font-semibold text-ink ring-1 ring-line transition hover:bg-paper active:scale-95"
          >
            <CalendarArrowDown size={16} aria-hidden="true" />
            <span>Export .ics</span>
          </button>
        </div>
      </div>

      <div className="rounded-3xl bg-card p-5 ring-1 ring-line shadow-clay">
        <h2 className="font-display text-lg font-bold text-ink">Event actions</h2>
        <p className="mt-0.5 text-xs text-mute">Reuse the setup or close it down.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Button
            type="button"
            variant="tonal"
            className="h-12 gap-1.5 font-semibold"
            disabled={working !== null}
            onClick={cloneEvent}
          >
            <Copy size={15} aria-hidden="true" />
            <span>{working === "clone" ? "Cloning…" : "Clone as draft"}</span>
          </Button>
          {confirmingCancel ? (
            <div className="flex gap-2">
              <Button
                type="button"
                className="h-12 flex-1 gap-1.5 bg-red-600 font-semibold text-white hover:bg-red-500"
                disabled={working !== null}
                onClick={cancelEvent}
              >
                <Trash2 size={15} aria-hidden="true" />
                <span>{working === "cancel" ? "Cancelling…" : "Confirm cancel"}</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-12 border border-line px-4 font-semibold"
                disabled={working !== null}
                onClick={() => setConfirmingCancel(false)}
              >
                Keep
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="ghost"
              className="h-12 gap-1.5 border border-red-500/30 font-semibold text-red-600 hover:bg-red-500/10"
              onClick={() => setConfirmingCancel(true)}
            >
              <Trash2 size={15} aria-hidden="true" />
              <span>Cancel event</span>
            </Button>
          )}
        </div>
        {confirmingCancel ? (
          <p className="mt-3 text-xs text-mute">Cancelling unpublishes “{event.name}”. Guests see it as ended.</p>
        ) : null}
      </div>

      <EventShareModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        eventId={event.id}
        title={event.name}
        venue={event.venue || ""}
        date={event.startsAt}
      />
    </div>
  );
}
