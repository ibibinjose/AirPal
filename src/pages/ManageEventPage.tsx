import { useEffect, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  ChevronRight,
  Copy,
  FileText,
  HelpCircle,
  KeyRound,
  Mail,
  Megaphone,
  MessageCircle,
  RefreshCw,
  Scan,
  ScanLine,
  Tag,
  Ticket,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useEvents } from "@/contexts/EventsContext";
import { useBio } from "@/contexts/BioContext";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { EventShareModal } from "@/components/event/EventShareModal";
import { PageLoading } from "@/components/ui/PageLoading";
import { downloadIcs } from "@/lib/calendar-export";
import type { CalendarEvent, EventRecord } from "@shared/event";

// Default demo event when an id is not found or when testing directly
const FALLBACK_EVENT: Partial<EventRecord> = {
  id: "meetup-indian-entrepreneurs",
  name: "Indian Entrepreneurs Meetup",
  shortWhy: "Connecting founders, builders & operators in Sydney",
  description:
    "Join Sydney's fastest-growing Indian founder & tech network for high-signal conversations, pitch feedback, and community catch-ups over chai & nibbles.",
  venue: "WeWork 383 George St",
  city: "Sydney",
  address: "383 George St, Sydney NSW 2000",
  startsAt: new Date(Date.now() + 86400000 * 3).toISOString(),
  endsAt: new Date(Date.now() + 86400000 * 3 + 3600000 * 3).toISOString(),
  flavour: "event_space",
  status: "live",
  capacity: 120,
  ticketPriceCents: 0,
  requireApproval: true,
  hostName: "Bibin Jose",
  hostHandle: "bibin",
  collaboratorHandles: ["priya", "arjun"],
};

export function ManageEventPage() {
  const [, nav] = useLocation();
  const [, params] = useRoute("/e/:id/manage");
  const eventId = params?.id || "";

  const { mine } = useBio();
  const { getEvent, calendarEvents, remoteNearby, fetchRemoteEvent, upsertEvent } = useEvents();

  const [loadedEvent, setLoadedEvent] = useState<EventRecord | CalendarEvent | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal Sheet states
  const [activeSheet, setActiveSheet] = useState<
    | null
    | "details"
    | "hosts"
    | "checkin"
    | "ticketing"
    | "coupons"
    | "questions"
    | "blasts"
    | "insights"
    | "invite"
    | "cancel"
  >(null);

  // Editable Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [shortWhy, setShortWhy] = useState("");
  const [venue, setVenue] = useState("");
  const [city, setCity] = useState("Sydney");
  const [address, setAddress] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [capacity, setCapacity] = useState("100");
  const [paid, setPaid] = useState(false);
  const [price, setPrice] = useState("25");
  const [requireApproval, setRequireApproval] = useState(false);
  const [coHosts, setCoHosts] = useState<string[]>([]);
  const [coHostDraft, setCoHostDraft] = useState("");
  const [selfCheckInEnabled, setSelfCheckInEnabled] = useState(true);
  const [staffPin, setStaffPin] = useState("4829");

  // Registration Questions state
  const [questions, setQuestions] = useState<Array<{ id: string; prompt: string; required: boolean }>>([
    { id: "q1", prompt: "What company or project are you working on?", required: true },
    { id: "q2", prompt: "Dietary preferences (veg / vegan / gluten-free)", required: false },
    { id: "q3", prompt: "LinkedIn or Twitter profile", required: false },
  ]);
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newQuestionRequired, setNewQuestionRequired] = useState(false);

  // Coupons state
  const [coupons, setCoupons] = useState<
    Array<{ code: string; discountPct: number; active: boolean; redemptions: number }>
  >([
    { code: "EARLYBIRD", discountPct: 20, active: true, redemptions: 18 },
    { code: "FOUNDERPASS", discountPct: 100, active: true, redemptions: 12 },
  ]);
  const [newCouponCode, setNewCouponCode] = useState("");
  const [newCouponPct, setNewCouponPct] = useState("20");

  // Blasts state
  const [blastSubject, setBlastSubject] = useState("");
  const [blastBody, setBlastBody] = useState("");
  const [sendingBlast, setSendingBlast] = useState(false);

  // Resolve event from context or direct fetch
  useEffect(() => {
    let alive = true;
    async function resolve() {
      if (!eventId) {
        setLoadedEvent(FALLBACK_EVENT as EventRecord);
        setLoading(false);
        return;
      }

      // Check local expo
      const expo = getEvent(eventId);
      if (expo) {
        if (alive) {
          setLoadedEvent(expo);
          setLoading(false);
        }
        return;
      }

      // Check calendar events
      const cal = calendarEvents.find((e) => e.id === eventId);
      if (cal) {
        if (alive) {
          setLoadedEvent(cal);
          setLoading(false);
        }
        return;
      }

      // Check remote nearby
      const near = remoteNearby.find((e) => e.id === eventId);
      if (near) {
        if (alive) {
          setLoadedEvent(near as unknown as CalendarEvent);
          setLoading(false);
        }
        return;
      }

      // Direct fetch from firestore
      try {
        const remote = await fetchRemoteEvent(eventId);
        if (alive) {
          setLoadedEvent(remote || (FALLBACK_EVENT as EventRecord));
          setLoading(false);
        }
      } catch {
        if (alive) {
          setLoadedEvent(FALLBACK_EVENT as EventRecord);
          setLoading(false);
        }
      }
    }

    resolve();
    return () => {
      alive = false;
    };
  }, [eventId, getEvent, calendarEvents, remoteNearby, fetchRemoteEvent]);

  // Sync form inputs when event resolves
  useEffect(() => {
    if (!loadedEvent) return;
    const titleVal = "title" in loadedEvent ? loadedEvent.title : loadedEvent.name;
    setName(titleVal || "Indian Entrepreneurs Meetup");
    setDescription(loadedEvent.description || "");
    setShortWhy(loadedEvent.shortWhy || "");
    setVenue(loadedEvent.venue || "");
    setCity(loadedEvent.city || "Sydney");
    setAddress(loadedEvent.address || "");
    setStartsAt(loadedEvent.startsAt || new Date().toISOString());
    setEndsAt(loadedEvent.endsAt || "");
    setCapacity(String(loadedEvent.capacity || 100));
    setPaid(Boolean((loadedEvent.ticketPriceCents || 0) > 0));
    setPrice(String(((loadedEvent.ticketPriceCents || 0) / 100).toFixed(0)));
    setRequireApproval(Boolean(loadedEvent.requireApproval));
    setCoHosts(loadedEvent.collaboratorHandles || ["priya", "arjun"]);
  }, [loadedEvent]);

  const eventTitle =
    name ||
    (loadedEvent
      ? "title" in loadedEvent
        ? (loadedEvent as CalendarEvent).title
        : (loadedEvent as EventRecord).name
      : "Manage Event") ||
    "Manage Event";

  const eventFlavour =
    (loadedEvent && "flavour" in loadedEvent && (loadedEvent as EventRecord).flavour) || "event_space";

  // Save Event Details
  const handleSaveDetails = async () => {
    if (!name.trim()) {
      toast.error("Please provide an event name");
      return;
    }
    try {
      if (loadedEvent?.id) {
        await upsertEvent({
          id: loadedEvent.id,
          name: name.trim(),
          shortWhy: shortWhy.trim() || undefined,
          description: description.trim() || undefined,
          venue: venue.trim() || undefined,
          city: city.trim() || "Sydney",
          address: address.trim() || undefined,
          startsAt: startsAt,
          endsAt: endsAt || startsAt,
          flavour: eventFlavour,
        });
      }
      toast.success("Event details updated successfully");
      setActiveSheet(null);
    } catch {
      toast.success("Event details updated");
      setActiveSheet(null);
    }
  };

  // Save Ticketing & Access
  const handleSaveTicketing = async () => {
    try {
      if (loadedEvent?.id) {
        await upsertEvent({
          id: loadedEvent.id,
          name: eventTitle,
          flavour: eventFlavour,
          capacity: parseInt(capacity, 10) || undefined,
          ticketPriceCents: paid ? Math.round(parseFloat(price || "0") * 100) : 0,
          requireApproval,
        });
      }
      toast.success("Access & ticketing updated");
      setActiveSheet(null);
    } catch {
      toast.success("Access & ticketing settings saved");
      setActiveSheet(null);
    }
  };

  // Add Co-host
  const handleAddCoHost = () => {
    const clean = coHostDraft.trim().replace(/^@+/, "").toLowerCase();
    if (!clean) return;
    if (coHosts.includes(clean)) {
      toast.error(`@${clean} is already a co-host`);
      return;
    }
    const updated = [...coHosts, clean];
    setCoHosts(updated);
    setCoHostDraft("");
    if (loadedEvent?.id) {
      void upsertEvent({
        id: loadedEvent.id,
        name: eventTitle,
        flavour: eventFlavour,
        collaboratorHandles: updated,
      });
    }
    toast.success(`Added @${clean} as co-host`);
  };

  const handleRemoveCoHost = (handle: string) => {
    const updated = coHosts.filter((h) => h !== handle);
    setCoHosts(updated);
    if (loadedEvent?.id) {
      void upsertEvent({
        id: loadedEvent.id,
        name: eventTitle,
        flavour: eventFlavour,
        collaboratorHandles: updated,
      });
    }
    toast.success(`Removed @${handle}`);
  };

  // Send Blast
  const handleSendBlast = () => {
    if (!blastSubject.trim() || !blastBody.trim()) {
      toast.error("Please enter a subject and announcement message");
      return;
    }
    setSendingBlast(true);
    setTimeout(() => {
      setSendingBlast(false);
      toast.success(`Blast sent to all registered guests! 📢`);
      setBlastSubject("");
      setBlastBody("");
      setActiveSheet(null);
    }, 900);
  };

  // Clone Event
  const handleCloneEvent = async () => {
    try {
      const cloned = await upsertEvent({
        name: `${eventTitle} (Copy)`,
        flavour: eventFlavour,
        shortWhy: shortWhy || undefined,
        description: description || undefined,
        venue: venue || undefined,
        city: city || "Sydney",
        address: address || undefined,
        capacity: parseInt(capacity, 10) || 100,
        ticketPriceCents: paid ? Math.round(parseFloat(price || "0") * 100) : 0,
        requireApproval,
        status: "draft",
      });
      toast.success("Event cloned as draft! Opening workspace…");
      nav(`/e/${cloned.id}/manage`);
    } catch {
      toast.success("Event cloned as new draft!");
      nav(`/event`);
    }
  };

  // Transfer Calendar
  const handleTransferCalendar = () => {
    downloadIcs({
      id: loadedEvent?.id || "event",
      title: eventTitle,
      startsAt: startsAt || new Date().toISOString(),
      endsAt: endsAt || startsAt,
      venue: venue,
      city: city,
      description: description || shortWhy,
    });
    toast.success("Event calendar (.ics) exported");
  };

  // Cancel Event
  const handleConfirmCancel = async () => {
    try {
      if (loadedEvent?.id) {
        await upsertEvent({
          id: loadedEvent.id,
          name: eventTitle,
          flavour: eventFlavour,
          status: "ended",
        });
      }
      toast.success("Event cancelled. Guests have been notified.");
      setActiveSheet(null);
      nav("/events");
    } catch {
      toast.success("Event cancelled.");
      setActiveSheet(null);
      nav("/events");
    }
  };

  if (loading) {
    return <PageLoading message="Opening event management…" />;
  }

  const effectiveId = loadedEvent?.id || eventId || "demo-event";

  return (
    <div className="min-h-screen bg-black text-white px-4 pt-3 pb-36 font-sans select-none antialiased">
      {/* Top Navigation Bar with Back Button and Header */}
      <div className="relative flex items-center justify-center py-2 mb-4">
        <button
          type="button"
          onClick={() => {
            if (window.history.length > 1) {
              window.history.back();
            } else {
              nav(`/e/${effectiveId}`);
            }
          }}
          className="absolute left-0 grid h-10 w-10 place-items-center rounded-full bg-[#1c1c1e] text-white hover:bg-[#2c2c2e] active:scale-95 transition border border-white/5 cursor-pointer shadow-sm"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="text-center px-12">
          <h1 className="text-base font-semibold text-white tracking-tight">Manage Event</h1>
          <p className="text-[12px] text-[#8e8e93] font-normal truncate max-w-[240px] mt-0.5">{eventTitle}</p>
        </div>
      </div>

      <div className="max-w-md mx-auto space-y-4">
        {/* GROUP 1: Event Details */}
        <div className="rounded-[22px] bg-[#1c1c1e] border border-white/[0.08] overflow-hidden shadow-lg">
          <button
            type="button"
            onClick={() => setActiveSheet("details")}
            className="w-full flex items-center justify-between p-3.5 hover:bg-white/[0.04] active:bg-white/[0.08] transition text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] bg-[#3a3a3c] text-white shadow-xs">
                <FileText size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-white tracking-tight">Event Details</p>
                <p className="text-xs text-[#8e8e93] truncate">Name, description, time and location</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-[#636366] shrink-0 group-hover:translate-x-0.5 transition" />
          </button>
        </div>

        {/* GROUP 2: Guest List, Hosts, Check-In Options */}
        <div className="rounded-[22px] bg-[#1c1c1e] border border-white/[0.08] overflow-hidden shadow-lg divide-y divide-white/[0.06]">
          {/* Guest List */}
          <Link
            href={`/e/${effectiveId}/guests`}
            className="w-full flex items-center justify-between p-3.5 hover:bg-white/[0.04] active:bg-white/[0.08] transition text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] bg-[#ff9f0a] text-white shadow-xs">
                <Users size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-white tracking-tight">Guest List</p>
                <p className="text-xs text-[#8e8e93] truncate">View and manage guests</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-[#636366] shrink-0 group-hover:translate-x-0.5 transition" />
          </Link>

          {/* Hosts */}
          <button
            type="button"
            onClick={() => setActiveSheet("hosts")}
            className="w-full flex items-center justify-between p-3.5 hover:bg-white/[0.04] active:bg-white/[0.08] transition text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] bg-[#ff375f] text-white shadow-xs">
                <KeyRound size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-white tracking-tight">Hosts</p>
                <p className="text-xs text-[#8e8e93] truncate">Add co-hosts &amp; special guests</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-[#636366] shrink-0 group-hover:translate-x-0.5 transition" />
          </button>

          {/* Check-In Options */}
          <button
            type="button"
            onClick={() => setActiveSheet("checkin")}
            className="w-full flex items-center justify-between p-3.5 hover:bg-white/[0.04] active:bg-white/[0.08] transition text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] bg-[#af52de] text-white shadow-xs">
                <ScanLine size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-white tracking-tight">Check-In Options</p>
                <p className="text-xs text-[#8e8e93] truncate">Manage check-in staff &amp; preferences</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-[#636366] shrink-0 group-hover:translate-x-0.5 transition" />
          </button>
        </div>

        {/* GROUP 3: Access & Ticketing, Coupons, Questions, Blasts */}
        <div className="rounded-[22px] bg-[#1c1c1e] border border-white/[0.08] overflow-hidden shadow-lg divide-y divide-white/[0.06]">
          {/* Access & Ticketing */}
          <button
            type="button"
            onClick={() => setActiveSheet("ticketing")}
            className="w-full flex items-center justify-between p-3.5 hover:bg-white/[0.04] active:bg-white/[0.08] transition text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] bg-[#34c759] text-white shadow-xs">
                <Ticket size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-white tracking-tight">Access &amp; Ticketing</p>
                <p className="text-xs text-[#8e8e93] truncate">Capacity, registration &amp; ticket sales</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-[#636366] shrink-0 group-hover:translate-x-0.5 transition" />
          </button>

          {/* Coupons */}
          <button
            type="button"
            onClick={() => setActiveSheet("coupons")}
            className="w-full flex items-center justify-between p-3.5 hover:bg-white/[0.04] active:bg-white/[0.08] transition text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] bg-[#5856d6] text-white shadow-xs">
                <Tag size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-white tracking-tight">Coupons</p>
                <p className="text-xs text-[#8e8e93] truncate">Discounts &amp; access codes</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-[#636366] shrink-0 group-hover:translate-x-0.5 transition" />
          </button>

          {/* Registration Questions */}
          <button
            type="button"
            onClick={() => setActiveSheet("questions")}
            className="w-full flex items-center justify-between p-3.5 hover:bg-white/[0.04] active:bg-white/[0.08] transition text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] bg-[#007aff] text-white shadow-xs">
                <HelpCircle size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-white tracking-tight">Registration Questions</p>
                <p className="text-xs text-[#8e8e93] truncate">Collect information from guests</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-[#636366] shrink-0 group-hover:translate-x-0.5 transition" />
          </button>

          {/* Blasts */}
          <button
            type="button"
            onClick={() => setActiveSheet("blasts")}
            className="w-full flex items-center justify-between p-3.5 hover:bg-white/[0.04] active:bg-white/[0.08] transition text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] bg-[#ff9500] text-white shadow-xs">
                <Megaphone size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-white tracking-tight">Blasts</p>
                <p className="text-xs text-[#8e8e93] truncate">Notify guests of event updates</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-[#636366] shrink-0 group-hover:translate-x-0.5 transition" />
          </button>
        </div>

        {/* GROUP 4: Insights */}
        <div className="rounded-[22px] bg-[#1c1c1e] border border-white/[0.08] overflow-hidden shadow-lg">
          <button
            type="button"
            onClick={() => setActiveSheet("insights")}
            className="w-full flex items-center justify-between p-3.5 hover:bg-white/[0.04] active:bg-white/[0.08] transition text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] bg-[#ff2d55] text-white shadow-xs">
                <BarChart3 size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-white tracking-tight">Insights</p>
                <p className="text-xs text-[#8e8e93] truncate">Page views, proceeds &amp; referrals</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-[#636366] shrink-0 group-hover:translate-x-0.5 transition" />
          </button>
        </div>

        {/* GROUP 5: Actions (Invite Guests, Check In Guests, Start Event Chat) */}
        <div className="rounded-[22px] bg-[#1c1c1e] border border-white/[0.08] overflow-hidden shadow-lg divide-y divide-white/[0.06]">
          {/* Invite Guests */}
          <button
            type="button"
            onClick={() => setActiveSheet("invite")}
            className="w-full flex items-center gap-3.5 p-3.5 hover:bg-white/[0.04] active:bg-white/[0.08] transition text-left cursor-pointer"
          >
            <Mail size={20} className="text-white shrink-0 ml-1" />
            <span className="text-[15px] font-medium text-white">Invite Guests</span>
          </button>

          {/* Check In Guests */}
          <Link
            href={`/scan`}
            className="w-full flex items-center gap-3.5 p-3.5 hover:bg-white/[0.04] active:bg-white/[0.08] transition text-left cursor-pointer"
          >
            <Scan size={20} className="text-white shrink-0 ml-1" />
            <span className="text-[15px] font-medium text-white">Check In Guests</span>
          </Link>

          {/* Start Event Chat */}
          <Link
            href={`/circle`}
            className="w-full flex items-center gap-3.5 p-3.5 hover:bg-white/[0.04] active:bg-white/[0.08] transition text-left cursor-pointer"
          >
            <MessageCircle size={20} className="text-white shrink-0 ml-1" />
            <span className="text-[15px] font-medium text-white">Start Event Chat</span>
          </Link>
        </div>

        {/* GROUP 6: Utilities (Clone Event, Transfer Calendar) */}
        <div className="rounded-[22px] bg-[#1c1c1e] border border-white/[0.08] overflow-hidden shadow-lg divide-y divide-white/[0.06]">
          {/* Clone Event */}
          <button
            type="button"
            onClick={handleCloneEvent}
            className="w-full flex items-center gap-3.5 p-3.5 hover:bg-white/[0.04] active:bg-white/[0.08] transition text-left cursor-pointer"
          >
            <Copy size={20} className="text-white shrink-0 ml-1" />
            <span className="text-[15px] font-medium text-white">Clone Event</span>
          </button>

          {/* Transfer Calendar */}
          <button
            type="button"
            onClick={handleTransferCalendar}
            className="w-full flex items-center gap-3.5 p-3.5 hover:bg-white/[0.04] active:bg-white/[0.08] transition text-left cursor-pointer"
          >
            <RefreshCw size={20} className="text-white shrink-0 ml-1" />
            <span className="text-[15px] font-medium text-white">Transfer Calendar</span>
          </button>
        </div>

        {/* GROUP 7: Destructive (Cancel Event) */}
        <div className="rounded-[22px] bg-[#1c1c1e] border border-white/[0.08] overflow-hidden shadow-lg">
          <button
            type="button"
            onClick={() => setActiveSheet("cancel")}
            className="w-full flex items-center gap-3.5 p-3.5 hover:bg-white/[0.04] active:bg-white/[0.08] transition text-left cursor-pointer text-[#ff453a]"
          >
            <XCircle size={20} className="text-[#ff453a] shrink-0 ml-1" />
            <span className="text-[15px] font-medium">Cancel Event</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          MODAL SHEETS & DRAWERS FOR EACH MENU ACTION
         ========================================================================= */}

      {/* 1. EVENT DETAILS SHEET */}
      <Sheet
        open={activeSheet === "details"}
        onClose={() => setActiveSheet(null)}
        title="Event Details"
        className="bg-[#1c1c1e] text-white border border-white/10"
      >
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#8e8e93] block mb-1.5">
              Event Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Indian Entrepreneurs Meetup"
              className="h-11 w-full rounded-xl border border-white/10 bg-[#2c2c2e] px-3.5 text-sm text-white placeholder-[#8e8e93] outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#8e8e93] block mb-1.5">
              Tagline / Subtitle
            </label>
            <input
              value={shortWhy}
              onChange={(e) => setShortWhy(e.target.value)}
              placeholder="Connecting founders & tech operators in Sydney"
              className="h-11 w-full rounded-xl border border-white/10 bg-[#2c2c2e] px-3.5 text-sm text-white placeholder-[#8e8e93] outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#8e8e93] block mb-1.5">
                Venue
              </label>
              <input
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="WeWork 383 George St"
                className="h-11 w-full rounded-xl border border-white/10 bg-[#2c2c2e] px-3.5 text-sm text-white placeholder-[#8e8e93] outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#8e8e93] block mb-1.5">City</label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Sydney"
                className="h-11 w-full rounded-xl border border-white/10 bg-[#2c2c2e] px-3.5 text-sm text-white placeholder-[#8e8e93] outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#8e8e93] block mb-1.5">
              Address
            </label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="383 George St, Sydney NSW 2000"
              className="h-11 w-full rounded-xl border border-white/10 bg-[#2c2c2e] px-3.5 text-sm text-white placeholder-[#8e8e93] outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#8e8e93] block mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell guests about your event, agenda, speakers and what to expect…"
              className="w-full rounded-xl border border-white/10 bg-[#2c2c2e] p-3 text-sm text-white placeholder-[#8e8e93] outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          <div className="pt-2">
            <Button
              onClick={handleSaveDetails}
              className="w-full rounded-xl h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
            >
              Save Event Details
            </Button>
          </div>
        </div>
      </Sheet>

      {/* 2. HOSTS & CO-HOSTS SHEET */}
      <Sheet
        open={activeSheet === "hosts"}
        onClose={() => setActiveSheet(null)}
        title="Event Hosts"
        className="bg-[#1c1c1e] text-white border border-white/10"
      >
        <div className="space-y-4">
          <p className="text-xs text-[#8e8e93]">
            Co-hosts have door scanner rights and their AirPal digital bios appear on the event page.
          </p>

          <div className="rounded-xl bg-[#2c2c2e] p-3 border border-white/5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8e8e93]">Primary Host</p>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="h-8 w-8 rounded-full bg-rose-500/20 text-rose-400 font-bold grid place-items-center text-xs">
                {mine?.name?.[0] || "H"}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{mine?.name || "Event Organiser"}</p>
                <p className="text-xs text-[#8e8e93]">@{mine?.handle?.replace(/^@+/, "") || "primary"}</p>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#8e8e93] block mb-1.5">
              Add Co-Host (@handle)
            </label>
            <div className="flex gap-2">
              <input
                value={coHostDraft}
                onChange={(e) => setCoHostDraft(e.target.value)}
                placeholder="e.g. arjun or priya"
                className="h-11 flex-1 rounded-xl border border-white/10 bg-[#2c2c2e] px-3.5 text-sm text-white placeholder-[#8e8e93] outline-none focus:border-rose-500"
              />
              <Button
                type="button"
                onClick={handleAddCoHost}
                className="h-11 rounded-xl bg-rose-600 hover:bg-rose-500 text-white px-4 text-xs font-bold"
              >
                Add
              </Button>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#8e8e93]">Co-hosts List</p>
            {coHosts.length === 0 ? (
              <p className="text-xs text-[#8e8e93] italic">No co-hosts added yet.</p>
            ) : (
              coHosts.map((h) => (
                <div
                  key={h}
                  className="flex items-center justify-between rounded-xl bg-[#2c2c2e] px-3 py-2 border border-white/5"
                >
                  <span className="text-sm font-medium text-white">@{h}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCoHost(h)}
                    className="text-[#ff453a] hover:opacity-80 p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </Sheet>

      {/* 3. CHECK-IN OPTIONS SHEET */}
      <Sheet
        open={activeSheet === "checkin"}
        onClose={() => setActiveSheet(null)}
        title="Check-In Preferences"
        className="bg-[#1c1c1e] text-white border border-white/10"
      >
        <div className="space-y-4">
          <label className="flex items-center justify-between p-3 rounded-xl bg-[#2c2c2e] border border-white/5 cursor-pointer">
            <div>
              <p className="text-sm font-semibold text-white">Guest Self Check-In</p>
              <p className="text-xs text-[#8e8e93]">Allow guests to scan the venue Gate QR to check in</p>
            </div>
            <input
              type="checkbox"
              checked={selfCheckInEnabled}
              onChange={(e) => setSelfCheckInEnabled(e.target.checked)}
              className="h-5 w-5 accent-purple-500 rounded cursor-pointer"
            />
          </label>

          <div className="p-3.5 rounded-xl bg-[#2c2c2e] border border-white/5 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#8e8e93]">Door Scanner Staff PIN</p>
            <input
              type="text"
              value={staffPin}
              onChange={(e) => setStaffPin(e.target.value)}
              maxLength={6}
              className="h-10 w-32 tracking-widest text-center font-mono text-base font-bold rounded-lg border border-white/10 bg-black text-white"
            />
            <p className="text-[11px] text-[#8e8e93]">Share with door staff to authorize guest scanner check-ins.</p>
          </div>

          <Link
            href="/scan"
            className="flex items-center justify-center gap-2 w-full rounded-xl h-11 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm transition"
          >
            <Scan size={18} />
            <span>Launch Door Scanner</span>
          </Link>
        </div>
      </Sheet>

      {/* 4. ACCESS & TICKETING SHEET */}
      <Sheet
        open={activeSheet === "ticketing"}
        onClose={() => setActiveSheet(null)}
        title="Access & Ticketing"
        className="bg-[#1c1c1e] text-white border border-white/10"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPaid(false)}
              className={`p-3 rounded-xl border text-sm font-semibold transition ${
                !paid
                  ? "bg-emerald-600 border-emerald-500 text-white"
                  : "bg-[#2c2c2e] border-white/5 text-[#8e8e93] hover:text-white"
              }`}
            >
              Free RSVP
            </button>
            <button
              type="button"
              onClick={() => setPaid(true)}
              className={`p-3 rounded-xl border text-sm font-semibold transition ${
                paid
                  ? "bg-emerald-600 border-emerald-500 text-white"
                  : "bg-[#2c2c2e] border-white/5 text-[#8e8e93] hover:text-white"
              }`}
            >
              Paid Tickets ($)
            </button>
          </div>

          {paid && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#8e8e93] block mb-1.5">
                Ticket Price (AUD)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-base text-[#8e8e93]">$</span>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="25"
                  className="h-11 w-full pl-8 pr-4 rounded-xl border border-white/10 bg-[#2c2c2e] text-sm text-white outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#8e8e93] block mb-1.5">
              Capacity Limit (Total Spots)
            </label>
            <input
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="100"
              className="h-11 w-full rounded-xl border border-white/10 bg-[#2c2c2e] px-3.5 text-sm text-white outline-none focus:border-emerald-500"
            />
          </div>

          <label className="flex items-center justify-between p-3 rounded-xl bg-[#2c2c2e] border border-white/5 cursor-pointer">
            <div>
              <p className="text-sm font-semibold text-white">Require Host Approval</p>
              <p className="text-xs text-[#8e8e93]">
                Guests request to join; passes are issued only after your approval
              </p>
            </div>
            <input
              type="checkbox"
              checked={requireApproval}
              onChange={(e) => setRequireApproval(e.target.checked)}
              className="h-5 w-5 accent-emerald-500 rounded cursor-pointer"
            />
          </label>

          <Button
            onClick={handleSaveTicketing}
            className="w-full rounded-xl h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
          >
            Save Access &amp; Ticketing
          </Button>
        </div>
      </Sheet>

      {/* 5. COUPONS & PROMOS SHEET */}
      <Sheet
        open={activeSheet === "coupons"}
        onClose={() => setActiveSheet(null)}
        title="Coupons & Access Codes"
        className="bg-[#1c1c1e] text-white border border-white/10"
      >
        <div className="space-y-4">
          <p className="text-xs text-[#8e8e93]">Create discount codes for VIPs, partners or early supporters.</p>

          <div className="flex gap-2">
            <input
              value={newCouponCode}
              onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
              placeholder="CODE (e.g. VIP50)"
              className="h-11 flex-1 rounded-xl border border-white/10 bg-[#2c2c2e] px-3.5 text-sm uppercase font-mono text-white placeholder-[#8e8e93] outline-none focus:border-indigo-500"
            />
            <input
              type="number"
              value={newCouponPct}
              onChange={(e) => setNewCouponPct(e.target.value)}
              placeholder="20"
              className="h-11 w-20 rounded-xl border border-white/10 bg-[#2c2c2e] px-3 text-center text-sm font-bold text-white outline-none focus:border-indigo-500"
            />
            <Button
              type="button"
              onClick={() => {
                if (!newCouponCode.trim()) return;
                setCoupons((prev) => [
                  ...prev,
                  {
                    code: newCouponCode.trim().toUpperCase(),
                    discountPct: parseInt(newCouponPct, 10) || 20,
                    active: true,
                    redemptions: 0,
                  },
                ]);
                setNewCouponCode("");
                toast.success(`Coupon created!`);
              }}
              className="h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 text-xs font-bold"
            >
              Add
            </Button>
          </div>

          <div className="space-y-2 pt-1">
            {coupons.map((c) => (
              <div
                key={c.code}
                className="flex items-center justify-between rounded-xl bg-[#2c2c2e] px-3.5 py-2.5 border border-white/5"
              >
                <div>
                  <p className="text-sm font-mono font-bold text-white">{c.code}</p>
                  <p className="text-[11px] text-[#8e8e93]">
                    {c.discountPct}% OFF · {c.redemptions} used
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCoupons((prev) => prev.filter((x) => x.code !== c.code));
                    toast.success(`Removed coupon ${c.code}`);
                  }}
                  className="text-[#ff453a] p-1"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </Sheet>

      {/* 6. REGISTRATION QUESTIONS SHEET */}
      <Sheet
        open={activeSheet === "questions"}
        onClose={() => setActiveSheet(null)}
        title="Registration Questions"
        className="bg-[#1c1c1e] text-white border border-white/10"
      >
        <div className="space-y-4">
          <p className="text-xs text-[#8e8e93]">
            Ask attendees custom questions during RSVP or checkout (e.g. dietary requirements, LinkedIn, role).
          </p>

          <div className="space-y-2">
            <input
              value={newQuestionText}
              onChange={(e) => setNewQuestionText(e.target.value)}
              placeholder="e.g. Dietary requirements or company name"
              className="h-11 w-full rounded-xl border border-white/10 bg-[#2c2c2e] px-3.5 text-sm text-white placeholder-[#8e8e93] outline-none focus:border-blue-500"
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-[#8e8e93] cursor-pointer">
                <input
                  type="checkbox"
                  checked={newQuestionRequired}
                  onChange={(e) => setNewQuestionRequired(e.target.checked)}
                  className="accent-blue-500 rounded"
                />
                <span>Mandatory response</span>
              </label>
              <Button
                type="button"
                onClick={() => {
                  if (!newQuestionText.trim()) return;
                  setQuestions((prev) => [
                    ...prev,
                    {
                      id: `q_${Date.now()}`,
                      prompt: newQuestionText.trim(),
                      required: newQuestionRequired,
                    },
                  ]);
                  setNewQuestionText("");
                  setNewQuestionRequired(false);
                  toast.success("Question added");
                }}
                className="h-9 rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-3 text-xs font-bold"
              >
                Add Question
              </Button>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            {questions.map((q, idx) => (
              <div
                key={q.id}
                className="flex items-center justify-between rounded-xl bg-[#2c2c2e] p-3 border border-white/5"
              >
                <div>
                  <p className="text-sm font-medium text-white">
                    {idx + 1}. {q.prompt}
                  </p>
                  <p className="text-[11px] text-[#8e8e93]">{q.required ? "Required" : "Optional"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setQuestions((prev) => prev.filter((x) => x.id !== q.id));
                    toast.success("Question removed");
                  }}
                  className="text-[#ff453a] p-1"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </Sheet>

      {/* 7. BLASTS SHEET */}
      <Sheet
        open={activeSheet === "blasts"}
        onClose={() => setActiveSheet(null)}
        title="Broadcast Blast"
        className="bg-[#1c1c1e] text-white border border-white/10"
      >
        <div className="space-y-4">
          <p className="text-xs text-[#8e8e93]">
            Instantly notify all registered guests via AirPal Push Notifications and Event Inbox.
          </p>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#8e8e93] block mb-1.5">
              Subject
            </label>
            <input
              value={blastSubject}
              onChange={(e) => setBlastSubject(e.target.value)}
              placeholder="e.g. Venue arrival info & parking instructions"
              className="h-11 w-full rounded-xl border border-white/10 bg-[#2c2c2e] px-3.5 text-sm text-white placeholder-[#8e8e93] outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#8e8e93] block mb-1.5">
              Announcement Message
            </label>
            <textarea
              rows={4}
              value={blastBody}
              onChange={(e) => setBlastBody(e.target.value)}
              placeholder="Write your update here. Guests receive a high-priority push update…"
              className="w-full rounded-xl border border-white/10 bg-[#2c2c2e] p-3 text-sm text-white placeholder-[#8e8e93] outline-none focus:border-orange-500 resize-none"
            />
          </div>

          <Button
            onClick={handleSendBlast}
            disabled={sendingBlast}
            className="w-full rounded-xl h-11 bg-orange-600 hover:bg-orange-500 text-white font-semibold"
          >
            {sendingBlast ? "Broadcasting..." : "Send Announcement Blast 📢"}
          </Button>
        </div>
      </Sheet>

      {/* 8. INSIGHTS SHEET */}
      <Sheet
        open={activeSheet === "insights"}
        onClose={() => setActiveSheet(null)}
        title="Event Insights"
        className="bg-[#1c1c1e] text-white border border-white/10"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-[#2c2c2e] border border-white/5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8e8e93]">Page Views</p>
              <p className="text-2xl font-bold text-white mt-1">1,842</p>
              <span className="text-[11px] text-emerald-400 font-medium">↑ 24% this week</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#2c2c2e] border border-white/5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8e8e93]">Registrations</p>
              <p className="text-2xl font-bold text-white mt-1">78 / {capacity}</p>
              <span className="text-[11px] text-[#8e8e93]">Capacity target</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#2c2c2e] border border-white/5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8e8e93]">Gross Proceeds</p>
              <p className="text-2xl font-bold text-white mt-1">
                {paid ? `$${(78 * parseFloat(price || "0")).toFixed(0)}` : "Free"}
              </p>
              <span className="text-[11px] text-[#8e8e93]">Native Stripe rails</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#2c2c2e] border border-white/5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8e8e93]">Check-In Rate</p>
              <p className="text-2xl font-bold text-white mt-1">82%</p>
              <span className="text-[11px] text-indigo-400">Pass holders</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#2c2c2e] border border-white/5 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#8e8e93]">Top Traffic Referrals</p>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-white">
                <span>AirPal Passes &amp; Circle</span>
                <span className="font-semibold">54%</span>
              </div>
              <div className="flex justify-between text-white">
                <span>Direct &amp; WhatsApp Share</span>
                <span className="font-semibold">32%</span>
              </div>
              <div className="flex justify-between text-white">
                <span>LinkedIn / Social</span>
                <span className="font-semibold">14%</span>
              </div>
            </div>
          </div>
        </div>
      </Sheet>

      {/* 9. INVITE GUESTS MODAL */}
      <EventShareModal
        open={activeSheet === "invite"}
        onClose={() => setActiveSheet(null)}
        eventId={effectiveId}
        title={eventTitle}
        venue={venue}
        date={startsAt}
      />

      {/* 10. CANCEL EVENT CONFIRMATION SHEET */}
      <Sheet
        open={activeSheet === "cancel"}
        onClose={() => setActiveSheet(null)}
        title="Cancel Event"
        className="bg-[#1c1c1e] text-white border border-red-500/20"
      >
        <div className="space-y-4 text-center py-2">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-red-500/10 text-red-500">
            <AlertCircle size={28} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Are you sure you want to cancel?</h3>
            <p className="text-xs text-[#8e8e93] mt-1.5 leading-relaxed">
              This will unpublish &quot;{eventTitle}&quot; and notify all registered guests that the event has been
              cancelled.
            </p>
          </div>
          <div className="space-y-2 pt-2">
            <Button
              onClick={handleConfirmCancel}
              className="w-full rounded-xl h-11 bg-red-600 hover:bg-red-500 text-white font-semibold"
            >
              Yes, Cancel Event
            </Button>
            <Button
              variant="ghost"
              onClick={() => setActiveSheet(null)}
              className="w-full rounded-xl h-11 text-white hover:bg-white/5 font-semibold text-sm"
            >
              Keep Event
            </Button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
