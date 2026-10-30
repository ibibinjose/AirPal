import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  AlertTriangle,
  CalendarArrowDown,
  Copy,
  ExternalLink,
  Mail,
  Megaphone,
  ScanLine,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useEvents } from "@/contexts/EventsContext";
import { EventShareModal } from "@/components/event/EventShareModal";
import { EventAnnounceModal } from "@/components/event/EventAnnounceModal";
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
  const [announceOpen, setAnnounceOpen] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [working, setWorking] = useState<"clone" | "cancel" | "publish" | null>(null);

  const publishLive = async () => {
    setWorking("publish");
    try {
      await upsertEvent({
        ...event,
        id: event.id,
        status: "live",
      });
      toast.success("Event is now officially live on AirPal! Visitors can now open the public link.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't publish live");
    } finally {
      setWorking(null);
    }
  };

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
      <div className="neu-card p-5">
        <h2 className="font-display text-lg font-bold text-ink">Run the day</h2>
        <p className="mt-0.5 text-xs text-mute">Doors, guests, and invites — everything live.</p>

        {event.status === "draft" && (
          <div className="mt-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="text-amber-500 shrink-0" size={18} />
              <div>
                <p className="text-xs font-bold text-amber-900 dark:text-amber-200">Event is currently in Draft mode</p>
                <p className="text-[11px] text-amber-700 dark:text-amber-300">
                  Invited guests and visitors will see <strong>404 · Page Not Found</strong> until published live.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              loading={working === "publish"}
              onClick={publishLive}
              className="min-h-[44px] text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
            >
              Publish Live Now
            </Button>
          </div>
        )}

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
            className="neu-btn inline-flex min-h-[48px] items-center justify-center gap-1.5 px-4 text-sm font-semibold text-ink transition active:scale-95"
          >
            <ScanLine size={16} aria-hidden="true" />
            <span>Door scanner</span>
          </Link>
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="neu-btn inline-flex min-h-[48px] cursor-pointer items-center justify-center gap-1.5 px-4 text-sm font-semibold text-ink transition active:scale-95"
          >
            <Mail size={16} aria-hidden="true" />
            <span>Invite guests</span>
          </button>
          <button
            type="button"
            onClick={() => setAnnounceOpen(true)}
            className="neu-btn inline-flex min-h-[48px] cursor-pointer items-center justify-center gap-1.5 px-4 text-sm font-semibold text-ink transition active:scale-95"
          >
            <Megaphone size={16} aria-hidden="true" />
            <span>Message guests</span>
          </button>
          <button
            type="button"
            onClick={exportIcs}
            className="neu-btn inline-flex min-h-[48px] cursor-pointer items-center justify-center gap-1.5 px-4 text-sm font-semibold text-ink transition active:scale-95"
          >
            <CalendarArrowDown size={16} aria-hidden="true" />
            <span>Export .ics</span>
          </button>
          <Link
            href={`/e/${event.id}`}
            className="neu-btn inline-flex min-h-[48px] items-center justify-center gap-1.5 px-4 text-sm font-semibold text-ink transition active:scale-95"
          >
            <ExternalLink size={16} aria-hidden="true" />
            <span>Public event page</span>
          </Link>
        </div>
      </div>

      <div className="neu-card p-5">
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
                className="neu-btn h-12 px-4 font-semibold"
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
        isDraft={event.status === "draft"}
      />
      <EventAnnounceModal
        open={announceOpen}
        onClose={() => setAnnounceOpen(false)}
        eventId={event.id}
        eventName={event.name}
      />
    </div>
  );
}
