import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  FileText,
  LayoutGrid,
  MapPin,
  Plus,
  QrCode,
  ShieldCheck,
  Sparkles,
  Store,
  Upload,
  Users,
} from "lucide-react";
import { EventLivePreviewCard } from "@/components/event/EventLivePreviewCard";
import { EventCreationTemplates, type EventTemplateConfig } from "@/components/event/EventCreationTemplates";
import { EventScheduleQuickPicks } from "@/components/event/EventScheduleQuickPicks";
import { EventCreatedCelebrationModal } from "@/components/event/EventCreatedCelebrationModal";
import { EventManagePanel } from "@/components/event/EventManagePanel";
import { EventNameMediaFields } from "@/components/event/EventNameMediaFields";
import { EventVenueFields } from "@/components/event/EventVenueFields";
import { EventAgendaFields } from "@/components/event/EventAgendaFields";
import { EventHostFields } from "@/components/event/EventHostFields";
import { EventDescriptionFields } from "@/components/event/EventDescriptionFields";
import { EventStudioNotFound } from "@/components/event/EventStudioNotFound";
import {
  EVENT_FLAVOURS,
  EVENT_FLAVOUR_LABELS,
  STALL_CATEGORIES,
  stallCsvTemplate,
  stallFieldLabels,
  stallUnitDisplay,
  expandWeeklyRecurrence,
  type EventFlavour,
  type EventLocationType,
  type EventRecord,
  type StallCategoryId,
  type StallRecord,
} from "@shared/event";

import { Button } from "@/components/ui/Button";
import { PageLoading } from "@/components/ui/PageLoading";
import { AuthGate } from "@/components/auth/AuthGate";
import { publicSiteOrigin } from "@/lib/public-origin";
import { formatWhen, fromLocalInput, nextSaturdayNine, sameDayFifteen, toLocalInput } from "@/lib/event-datetime";
import { useAuth } from "@/contexts/AuthContext";
import { useEvents } from "@/contexts/EventsContext";
import { useBio } from "@/contexts/BioContext";
import { makeQrDataUrl } from "@/lib/qr";
import { friendlyFunctionError } from "@/lib/functions";

import { cn } from "@/lib/cn";
import { HostFreshnessBanner } from "@/components/host/HostFreshnessBanner";
import { EventFestivalFields, type FestivalFieldValues } from "@/components/event/EventFestivalFields";
import {
  EventTicketFields,
  ticketValuesToCents,
  validateTickets,
  type TicketFieldValues,
} from "@/components/event/EventTicketFields";
import { EventCouponManager } from "@/components/event/EventCouponManager";
import { StallHandleField } from "@/components/event/StallHandleField";
import { landing, landingItem } from "@/lib/motion";
import { Photo } from "@/components/ui/Photo";

const FLAVOUR_META: Record<EventFlavour, { icon: typeof Store; blurb: string }> = {
  market: { icon: Store, blurb: "Makers, produce, and weekend stalls." },
  expo: { icon: LayoutGrid, blurb: "Trade floor, exhibitors, and a scanned directory." },
  event_space: { icon: Sparkles, blurb: "A one-off gathering with a gate QR." },
};

const CREATE_SECTIONS = [
  { id: "sec-templates", label: "Templates" },
  { id: "sec-format", label: "1. Format" },
  { id: "sec-banner", label: "2. Name & Banner" },
  { id: "sec-venue", label: "3. Venue" },
  { id: "sec-schedule", label: "4. Schedule" },
  { id: "sec-host", label: "5. Host" },
  { id: "sec-story", label: "6. Story" },
  { id: "sec-status", label: "7. Status & Tickets" },
] as const;

export function EventStudioPage({ eventId, forceCreate }: { eventId?: string; forceCreate?: boolean }) {
  const [, nav] = useLocation();
  const { user, authReady } = useAuth();
  const { mine, business } = useBio();
  const {
    events,
    myEvent: ownEvent,
    stallsFor,
    upsertEvent,
    importCsv,
    upsertStall,
    confirmEventSchedule,
    getEvent,
    calendarEvents,
    remoteNearby,
    remoteRecords,
    remoteLoaded,
    fetchRemoteEvent,
  } = useEvents();

  const [creatingNew, setCreatingNew] = useState<boolean>(Boolean(forceCreate));
  const [selectedEventId, setSelectedEventId] = useState<string | null>(eventId ?? null);

  useEffect(() => {
    if (forceCreate) {
      setCreatingNew(true);
    } else if (eventId) {
      setCreatingNew(false);
      setSelectedEventId(eventId);
    }
  }, [forceCreate, eventId]);

  // A routed :id (e.g. /e/:id/manage) focuses that event; otherwise the
  // studio follows the organiser's selected/own event, or the create flow when none.
  const [managedEvent, setManagedEvent] = useState<EventRecord | null>(null);
  const [managedMissing, setManagedMissing] = useState(false);
  useEffect(() => {
    let alive = true;
    setManagedEvent(null);
    setManagedMissing(false);
    if (!eventId) return () => {};
    const local =
      getEvent(eventId) ??
      (calendarEvents.find((e) => e.id === eventId) as unknown as EventRecord | undefined) ??
      (remoteNearby.find((e) => e.id === eventId) as unknown as EventRecord | undefined);
    if (local) {
      setManagedEvent(local);
      return () => {};
    }
    void fetchRemoteEvent(eventId)
      .then((remote) => {
        if (!alive) return;
        if (remote) setManagedEvent(remote as unknown as EventRecord);
        else setManagedMissing(true);
      })
      .catch(() => {
        if (alive) setManagedMissing(true);
      });
    return () => {
      alive = false;
    };
  }, [eventId, getEvent, calendarEvents, remoteNearby, fetchRemoteEvent]);

  const myEvents = useMemo(() => {
    const map = new Map<string, EventRecord>();
    for (const ev of events) {
      map.set(ev.id, ev);
    }
    if (ownEvent && !map.has(ownEvent.id)) {
      map.set(ownEvent.id, ownEvent);
    }
    if (managedEvent && !map.has(managedEvent.id)) {
      map.set(managedEvent.id, managedEvent);
    }
    return Array.from(map.values());
  }, [events, ownEvent, managedEvent]);

  const activeEvent = useMemo(() => {
    if (creatingNew) return null;
    if (selectedEventId) {
      const found = myEvents.find((e) => e.id === selectedEventId) ?? getEvent(selectedEventId);
      if (found) return found;
    }
    return managedEvent ?? ownEvent;
  }, [creatingNew, selectedEventId, myEvents, getEvent, managedEvent, ownEvent]);

  const reduce = useReducedMotion();
  const [tab, setTab] = useState<"today" | "stalls" | "print" | "manage" | "settings">(eventId ? "manage" : "today");

  // Event core fields
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const nameError =
    (nameTouched || name.length > 0) && name.trim().length < 2
      ? "Please enter an event name (at least 2 characters)"
      : null;
  const [flavour, setFlavour] = useState<EventFlavour>("market");
  const [city, setCity] = useState("Sydney");
  const [venue, setVenue] = useState("");
  const [room, setRoom] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [shortWhy, setShortWhy] = useState("");
  const [mapsPlaceId, setMapsPlaceId] = useState("");
  const [geo, setGeo] = useState<{ lat: number; lng: number } | undefined>();
  const [coverImage, setCoverImage] = useState("");
  const [themeColor, setThemeColor] = useState("#004eff");
  const [locationType, setLocationType] = useState<EventLocationType>("in_person");
  const [virtualUrl, setVirtualUrl] = useState("");
  const [requireApproval, setRequireApproval] = useState(false);
  const [agenda, setAgenda] = useState<{ time: string; title: string }[]>([]);
  const [refundPolicy, setRefundPolicy] = useState("");
  const [directions, setDirections] = useState("");
  const [registrationClosed, setRegistrationClosed] = useState(false);
  const [startsLocal, setStartsLocal] = useState(() => toLocalInput(nextSaturdayNine().toISOString()));
  const [endsLocal, setEndsLocal] = useState(() => toLocalInput(sameDayFifteen(nextSaturdayNine()).toISOString()));
  const [status, setStatus] = useState<"draft" | "live" | "ended">("live");

  // Host info state
  const [hostType, setHostType] = useState<"business" | "individual">("business");
  const [hostName, setHostName] = useState("");
  const [hostHandle, setHostHandle] = useState("");

  // Collaborator handles state
  const [collaboratorHandles, setCollaboratorHandles] = useState<string[]>([]);
  const [collaboratorInput, setCollaboratorInput] = useState("");
  const [sponsorHandles, setSponsorHandles] = useState<string[]>([]);
  const [sponsorInput, setSponsorInput] = useState("");

  // Festival program state
  const [festivalFields, setFestivalFields] = useState<FestivalFieldValues>({
    festivalSlug: "",
    track: "",
    registrationUrl: "",
    registrationNote: "",
    speakers: [],
  });

  // Ticket state
  const [ticketFields, setTicketFields] = useState<TicketFieldValues>({
    paid: false,
    price: "25",
    capacity: "40",
    tiers: [],
  });
  const [repeatCount, setRepeatCount] = useState(1);

  // Stall creation & editing form states
  const [stallName, setStallName] = useState("");
  const [booth, setBooth] = useState("");
  const [stallLocation, setStallLocation] = useState("");
  const [stallHandle, setStallHandle] = useState("");
  const [stallOffer, setStallOffer] = useState("");
  const [stallWhy, setStallWhy] = useState("");
  const [stallCategory, setStallCategory] = useState<StallCategoryId>("shops");
  const [editingStallId, setEditingStallId] = useState<string | null>(null);
  const [addingStall, setAddingStall] = useState(false);

  const [qr, setQr] = useState("");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [mobilePreview, setMobilePreview] = useState(false);
  const [celebrationEventId, setCelebrationEventId] = useState<string | null>(null);
  const [celebrationEventName, setCelebrationEventName] = useState<string>("");

  const stalls = activeEvent ? stallsFor(activeEvent.id) : [];

  function startNewEventDraft() {
    setName("");
    setFlavour("market");
    setVenue(business?.name || "");
    setAddress("");
    setCity(business?.city || "Sydney");
    setRoom("");
    setDescription("");
    setShortWhy("");
    setCoverImage("");
    setDirections("");
    setRefundPolicy("");
    setAgenda([]);
    setStartsLocal(toLocalInput(nextSaturdayNine().toISOString()));
    setEndsLocal(toLocalInput(sameDayFifteen(nextSaturdayNine()).toISOString()));
    setStatus("live");
    setRepeatCount(1);
    setMobilePreview(false);
    setCreatingNew(true);
  }

  useEffect(() => {
    if (!activeEvent) {
      if (business?.handle) {
        setHostType("business");
        setHostName(business.name);
        setHostHandle(business.handle);
      } else if (mine?.handle) {
        setHostType("individual");
        setHostName(mine.name);
        setHostHandle(mine.handle);
      }
      return;
    }
    setName(activeEvent.name);
    setFlavour(activeEvent.flavour);
    setCity(activeEvent.city || "Sydney");
    setVenue(activeEvent.venue || "");
    setRoom(activeEvent.room || "");
    setAddress(activeEvent.address || "");
    setDescription(activeEvent.description || "");
    setShortWhy(activeEvent.shortWhy || "");
    setMapsPlaceId(activeEvent.mapsPlaceId || "");
    setGeo(activeEvent.geo);
    setCoverImage(activeEvent.coverImage || "");
    setThemeColor(activeEvent.themeColor || "#004eff");
    setLocationType(activeEvent.locationType || "in_person");
    setVirtualUrl(activeEvent.virtualUrl || "");
    setRequireApproval(Boolean(activeEvent.requireApproval));
    setAgenda(activeEvent.agenda || []);
    setRefundPolicy(activeEvent.refundPolicy || "");
    setDirections(activeEvent.directions || "");
    setRegistrationClosed(Boolean(activeEvent.registrationClosed));
    setHostType(activeEvent.hostType || (activeEvent.businessHandle ? "business" : "individual"));
    setHostName(activeEvent.hostName || activeEvent.businessName || "");
    setHostHandle(activeEvent.hostHandle || activeEvent.businessHandle || "");
    setCollaboratorHandles(activeEvent.collaboratorHandles || []);
    setCollaboratorInput("");
    setSponsorHandles(activeEvent.sponsorHandles || []);
    setSponsorInput("");
    setFestivalFields({
      festivalSlug: activeEvent.festivalSlug || "",
      track: activeEvent.track || "",
      registrationUrl: activeEvent.registrationUrl || "",
      registrationNote: activeEvent.registrationNote || "",
      speakers: activeEvent.speakers || [],
    });
    setStartsLocal(toLocalInput(activeEvent.startsAt));
    setEndsLocal(toLocalInput(activeEvent.endsAt));
    setStatus(activeEvent.status);
    setTicketFields({
      paid: (activeEvent.ticketPriceCents || 0) > 0,
      price: String(((activeEvent.ticketPriceCents || 2500) / 100).toFixed(2)),
      capacity: String(activeEvent.capacity || 40),
      tiers: (activeEvent.ticketTiers || []).map((t) => ({
        id: t.id,
        name: t.name,
        price: String((t.priceCents / 100).toFixed(2)),
        capacity: t.capacity ? String(t.capacity) : "",
      })),
    });
    const origin = publicSiteOrigin();
    void makeQrDataUrl(`${origin}${activeEvent.gatePath}`).then(setQr);
  }, [activeEvent, business, mine]);

  function addCollaborator(handleRaw: string) {
    const clean = handleRaw.trim().replace(/^@+/, "").toLowerCase();
    if (!clean) return;
    if (collaboratorHandles.includes(clean)) {
      toast.error(`@${clean} is already added as a collaborator`);
      return;
    }
    if (clean === hostHandle.trim().replace(/^@+/, "").toLowerCase()) {
      toast.error(`@${clean} is already the primary host`);
      return;
    }
    setCollaboratorHandles((prev) => [...prev, clean]);
    setCollaboratorInput("");
    toast.success(`Added @${clean} to collaborators`);
  }

  function removeCollaborator(handle: string) {
    setCollaboratorHandles((prev) => prev.filter((h) => h !== handle));
  }

  function addSponsor(handleRaw: string) {
    const clean = handleRaw.trim().replace(/^@+/, "").toLowerCase();
    if (!clean) return;
    if (sponsorHandles.includes(clean)) {
      toast.error(`@${clean} is already added as a sponsor`);
      return;
    }
    setSponsorHandles((prev) => [...prev, clean]);
    setSponsorInput("");
    toast.success(`Added @${clean} as a sponsor`);
  }

  function removeSponsor(handle: string) {
    setSponsorHandles((prev) => prev.filter((h) => h !== handle));
  }

  function applyTemplate(tmpl: EventTemplateConfig) {
    setName(tmpl.suggestedName);
    setShortWhy(tmpl.suggestedWhy);
    setFlavour(tmpl.flavour);
    setCoverImage(tmpl.coverImage);
    if (tmpl.themeColor) setThemeColor(tmpl.themeColor);
    if (tmpl.locationType) setLocationType(tmpl.locationType);
    if (tmpl.requireApproval !== undefined) setRequireApproval(tmpl.requireApproval);
    const d = new Date();
    d.setDate(d.getDate() + tmpl.daysAhead);
    d.setHours(tmpl.startHour, 0, 0, 0);
    const end = new Date(d);
    end.setHours(d.getHours() + tmpl.durationHours);
    setStartsLocal(toLocalInput(d.toISOString()));
    setEndsLocal(toLocalInput(end.toISOString()));
    setTicketFields({
      paid: tmpl.paid,
      price: tmpl.price,
      capacity: tmpl.capacity,
      tiers: [],
    });
    toast.success(`Applied template: ${tmpl.label}`);
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setNameTouched(true);
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      toast.error("Give the event a name (at least 2 characters)");
      return;
    }
    const startsAt = fromLocalInput(startsLocal);
    const endsAt = fromLocalInput(endsLocal);
    if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
      toast.error("End time needs to be after start");
      return;
    }
    const ticketError = validateTickets(ticketFields);
    if (ticketError) {
      toast.error(ticketError);
      return;
    }
    setCreating(true);
    let first: { id: string; name: string } | null = null;
    try {
      const cleanHostHandle = hostHandle.trim().replace(/^@+/, "").toLowerCase() || undefined;
      const baseStarts = startsAt || new Date().toISOString();
      const baseEnds = endsAt || "";
      const instances = expandWeeklyRecurrence(baseStarts, baseEnds, repeatCount);
      const seriesId =
        instances.length > 1 ? `ser-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}` : undefined;
      for (let i = 0; i < instances.length; i++) {
        const inst = instances[i]!;
        const created = await upsertEvent({
          name: trimmed,
          flavour,
          city: city.trim() || "Sydney",
          venue: venue.trim(),
          room: room.trim() || undefined,
          address: address.trim() || undefined,
          description: description.trim() || undefined,
          shortWhy: shortWhy.trim() || undefined,
          mapsPlaceId: mapsPlaceId.trim() || undefined,
          geo,
          coverImage: coverImage.trim() || undefined,
          themeColor,
          locationType,
          virtualUrl: locationType === "virtual" ? virtualUrl.trim() || undefined : undefined,
          requireApproval,
          agenda: agenda.length > 0 ? agenda : undefined,
          refundPolicy: refundPolicy.trim() || undefined,
          directions: directions.trim() || undefined,
          registrationClosed,
          hostType,
          hostName: hostName.trim() || undefined,
          hostHandle: cleanHostHandle,
          businessName: hostType === "business" ? hostName.trim() || undefined : undefined,
          businessHandle: hostType === "business" ? cleanHostHandle : undefined,
          collaboratorHandles: collaboratorHandles.length > 0 ? collaboratorHandles : undefined,
          sponsorHandles: sponsorHandles.length > 0 ? sponsorHandles : undefined,
          startsAt: inst.startsAt,
          endsAt: inst.endsAt || undefined,
          status,
          ...ticketValuesToCents(ticketFields),
          festivalSlug: festivalFields.festivalSlug.trim(),
          track: festivalFields.track.trim() || undefined,
          registrationUrl: festivalFields.registrationUrl.trim() || undefined,
          registrationNote: festivalFields.registrationNote.trim() || undefined,
          speakers: festivalFields.speakers.length > 0 ? festivalFields.speakers : undefined,
          seriesId,
          recurrenceIndex: seriesId ? i + 1 : undefined,
          recurrenceCount: seriesId ? instances.length : undefined,
        });
        if (i === 0) first = { id: created.id, name: created.name };
      }
      if (!first) throw new Error("Couldn't create event");
      setCreatingNew(false);
      setSelectedEventId(first.id);
      setCelebrationEventId(first.id);
      setCelebrationEventName(first.name);
      toast.success(
        seriesId ? `${instances.length} weekly events created and live! 🎉` : "Event created and officially live! 🎉",
      );
      setTab(flavour === "market" || flavour === "expo" ? "stalls" : "today");
    } catch (err) {
      const msg = friendlyFunctionError(err) || (err instanceof Error ? err.message : "Couldn’t publish event");
      if (first) {
        setCreatingNew(false);
        setSelectedEventId(first.id);
        setTab("settings");
        toast.error(`Saved on device, but could not publish live: ${msg}`);
      } else {
        toast.error(msg);
      }
    } finally {
      setCreating(false);
    }
  }

  async function onCsv(file: File) {
    if (!activeEvent) return;
    const text = await file.text();
    const n = await importCsv(activeEvent.id, text);
    toast.success(`${n} stalls imported`);
    setTab("stalls");
  }

  function resetStallForm() {
    setEditingStallId(null);
    setStallName("");
    setBooth("");
    setStallLocation("");
    setStallHandle("");
    setStallOffer("");
    setStallWhy("");
    setStallCategory("shops");
  }

  function editStall(s: StallRecord) {
    setEditingStallId(s.id);
    setStallName(s.name);
    setBooth(s.booth || "");
    setStallLocation(s.location || "");
    setStallHandle(s.handle || "");
    setStallOffer(s.offer || "");
    setStallWhy(s.shortWhy || "");
    setStallCategory(s.category);
    setTab("stalls");
  }

  async function onAddStall(e: FormEvent) {
    e.preventDefault();
    if (!activeEvent || !stallName.trim()) {
      toast.error("Add a business or stall name");
      return;
    }
    setAddingStall(true);
    try {
      await upsertStall({
        id: editingStallId || undefined,
        eventId: activeEvent.id,
        name: stallName.trim(),
        category: stallCategory,
        booth: booth.trim(),
        location: stallLocation.trim() || undefined,
        shortWhy: stallWhy.trim(),
        offer: stallOffer.trim() || undefined,
        handle: stallHandle.trim().replace(/^@+/, "").toLowerCase() || undefined,
      });
      resetStallForm();
      toast.success(editingStallId ? "Stall updated" : "Stall added to directory");
    } catch (err) {
      const msg = friendlyFunctionError(err) || (err instanceof Error ? err.message : "Could not save stall");
      toast.error(msg);
    } finally {
      setAddingStall(false);
    }
  }

  async function onSaveSettings(e: FormEvent) {
    e.preventDefault();
    if (!activeEvent) return;
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      toast.error("Give the event a name");
      return;
    }
    const startsAt = fromLocalInput(startsLocal);
    const endsAt = fromLocalInput(endsLocal);
    const ticketError = validateTickets(ticketFields);
    if (ticketError) {
      toast.error(ticketError);
      return;
    }
    setSaving(true);
    try {
      const cleanHostHandle = hostHandle.trim().replace(/^@+/, "").toLowerCase() || undefined;
      await upsertEvent({
        id: activeEvent.id,
        name: trimmed,
        flavour,
        city: city.trim() || "Sydney",
        venue: venue.trim(),
        room: room.trim() || undefined,
        address: address.trim() || undefined,
        description: description.trim() || undefined,
        shortWhy: shortWhy.trim() || undefined,
        mapsPlaceId: mapsPlaceId.trim() || undefined,
        geo,
        coverImage: coverImage.trim() || undefined,
        themeColor,
        locationType,
        virtualUrl: locationType === "virtual" ? virtualUrl.trim() || undefined : undefined,
        requireApproval,
        agenda: agenda.length > 0 ? agenda : undefined,
        refundPolicy: refundPolicy.trim() || undefined,
        directions: directions.trim() || undefined,
        registrationClosed,
        hostType,
        hostName: hostName.trim() || undefined,
        hostHandle: cleanHostHandle,
        businessName: hostType === "business" ? hostName.trim() || undefined : undefined,
        businessHandle: hostType === "business" ? cleanHostHandle : undefined,
        collaboratorHandles: collaboratorHandles.length > 0 ? collaboratorHandles : undefined,
        sponsorHandles: sponsorHandles.length > 0 ? sponsorHandles : undefined,
        startsAt: startsAt || activeEvent.startsAt,
        endsAt: endsAt || activeEvent.endsAt,
        status,
        ...ticketValuesToCents(ticketFields),
        festivalSlug: festivalFields.festivalSlug.trim(),
        track: festivalFields.track.trim() || undefined,
        registrationUrl: festivalFields.registrationUrl.trim() || undefined,
        registrationNote: festivalFields.registrationNote.trim() || undefined,
        speakers: festivalFields.speakers.length > 0 ? festivalFields.speakers : [],
      });
      toast.success("Event details and Google place saved live on AirPal");
    } catch (err) {
      const msg = friendlyFunctionError(err) || (err instanceof Error ? err.message : "Couldn’t save event details");
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  const isLocalOnly = Boolean(
    activeEvent &&
    remoteLoaded &&
    !remoteRecords.some((r) => r.id === activeEvent.id) &&
    !remoteNearby.some((r) => r.id === activeEvent.id),
  );

  async function handlePublishLive() {
    if (!activeEvent) return;
    setPublishing(true);
    try {
      await upsertEvent({
        ...activeEvent,
        id: activeEvent.id,
      });
      toast.success("Event is now officially live on AirPal! Visitors can now open the public link.");
    } catch (err) {
      const msg = friendlyFunctionError(err) || (err instanceof Error ? err.message : "Failed to publish live");
      toast.error(`Could not publish live: ${msg}`);
    } finally {
      setPublishing(false);
    }
  }

  if (!authReady) {
    return <PageLoading message="Loading event workspace…" />;
  }

  if (!user) {
    return (
      <AuthGate
        next="/event"
        kicker="Event Organiser"
        title="Create an event"
        lede="Sign in or create an account first. Then you can run a market, expo, or festival directory with instant gate QR codes and Google Maps place integration."
      />
    );
  }

  // Routed :id that resolves to nothing — honest dead end.
  if (eventId && !activeEvent && !creatingNew) {
    if (!managedMissing) {
      return <PageLoading message="Opening event studio…" />;
    }
    return <EventStudioNotFound />;
  }

  // EVENT CREATION FLOW
  if (!activeEvent) {
    return (
      <div data-theme="light" className="relative isolate overflow-hidden min-h-[85vh] bg-paper">
        <motion.div
          className="relative mx-auto max-w-6xl px-4 py-8 pb-24"
          initial={reduce ? false : "hidden"}
          animate="show"
          variants={reduce ? undefined : landing}
        >
          <motion.header variants={landingItem}>
            <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  href="/pass"
                  className="neu-btn inline-flex min-h-[44px] items-center gap-1.5 px-3.5 text-xs font-semibold text-mute hover:text-ink transition"
                >
                  <ArrowLeft size={13} />
                  <span>AirPal Pass</span>
                </Link>
                <Link
                  href="/events"
                  className="neu-btn inline-flex min-h-[44px] items-center gap-1 px-3.5 text-xs font-semibold text-mute hover:text-ink transition"
                >
                  <span>Browse Events</span>
                </Link>
                <Link
                  href="/scan"
                  className="neu-btn inline-flex min-h-[44px] items-center gap-1.5 px-3.5 text-xs font-semibold text-mute hover:text-ink transition"
                >
                  <QrCode size={13} className="text-amber-500" />
                  <span>Door Scanner</span>
                </Link>
                <Link
                  href="/business"
                  className="neu-btn inline-flex min-h-[44px] items-center gap-1.5 px-3.5 text-xs font-semibold text-mute hover:text-ink transition"
                >
                  <Building2 size={13} className="text-accent" />
                  <span>Business Hub</span>
                </Link>
              </div>

              {myEvents.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setCreatingNew(false);
                    setSelectedEventId(myEvents[0]?.id ?? null);
                  }}
                  className="neu-chip neu-tint-brand inline-flex min-h-[44px] items-center gap-1.5 px-4 text-xs font-bold text-accent transition"
                >
                  <LayoutGrid size={13} />
                  <span>Manage Existing Events ({myEvents.length})</span>
                </button>
              )}
            </div>

            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-accent">
                    AirPal Pass · Event Studio
                  </span>
                  <span className="text-xs text-mute font-medium">Tickets &amp; Passes</span>
                </div>
                <h1 className="human-title mt-2 text-3xl md:text-4xl text-balance">Create a Market, Expo or Event</h1>
                <p className="human-lede mt-2 text-sm sm:text-base max-w-xl">
                  Pick a format, search Google Place for the venue, and set your schedule. Guests scan the entrance Gate
                  QR into a live directory.
                </p>
              </div>

              {/* Mobile View Toggle */}
              <div className="flex w-full sm:w-auto lg:hidden items-center neu-inset p-1">
                <button
                  type="button"
                  onClick={() => setMobilePreview(false)}
                  className={cn(
                    "min-h-[44px] flex-1 sm:flex-initial px-4 py-1.5 text-xs font-bold rounded-xl transition whitespace-nowrap",
                    !mobilePreview ? "bg-brand text-white shadow-xs" : "text-mute hover:text-ink",
                  )}
                >
                  Edit Details
                </button>
                <button
                  type="button"
                  onClick={() => setMobilePreview(true)}
                  className={cn(
                    "min-h-[44px] flex-1 sm:flex-initial px-4 py-1.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 whitespace-nowrap",
                    mobilePreview ? "bg-brand text-white shadow-xs" : "text-mute hover:text-ink",
                  )}
                >
                  <Eye size={13} className="shrink-0" />
                  <span>Live Preview</span>
                </button>
              </div>
            </div>

            {/* Quick Section Jump Bar */}
            {!mobilePreview && (
              <nav
                aria-label="Event creation steps"
                className="mt-4 flex overflow-x-auto no-scrollbar gap-1.5 neu-inset p-1.5"
              >
                {CREATE_SECTIONS.map((sec) => (
                  <a
                    key={sec.id}
                    href={`#${sec.id}`}
                    className="inline-flex min-h-[44px] shrink-0 items-center rounded-xl px-3 text-sm font-semibold text-mute hover:bg-paper hover:text-ink transition whitespace-nowrap"
                  >
                    {sec.label}
                  </a>
                ))}
              </nav>
            )}
          </motion.header>

          <div className="mt-6 lg:grid lg:grid-cols-12 lg:gap-8 lg:items-start">
            {/* Left: Editor Form */}
            <div className={cn("lg:col-span-7", mobilePreview ? "hidden lg:block" : "block")}>
              <motion.form variants={landingItem} className="space-y-6" onSubmit={onCreate}>
                {/* 1-Tap Quick-Start Templates */}
                <div id="sec-templates" className="scroll-mt-24 neu-section p-5">
                  <EventCreationTemplates onApplyTemplate={applyTemplate} />
                </div>

                {/* Flavour Card Selector */}
                <div id="sec-format" className="scroll-mt-24 neu-section p-5 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-accent">1. What kind of event?</p>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                    {EVENT_FLAVOURS.map((id) => {
                      const meta = FLAVOUR_META[id];
                      const Icon = meta.icon;
                      const on = flavour === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          aria-pressed={on}
                          onClick={() => setFlavour(id)}
                          className={cn(
                            "rounded-2xl p-4 text-left transition duration-200 active:scale-[0.98]",
                            on ? "bg-brand text-white shadow-md" : "neu-card text-mute hover:text-ink",
                          )}
                        >
                          <span
                            className={cn(
                              "grid h-10 w-10 place-items-center rounded-xl",
                              on ? "bg-white/15 text-white ring-1 ring-white/25" : "bg-brand/10 text-accent",
                            )}
                          >
                            <Icon size={18} />
                          </span>
                          <span className="mt-3 block text-sm font-bold">{EVENT_FLAVOUR_LABELS[id]}</span>
                          <span
                            className={cn("mt-1 block text-xs leading-relaxed", on ? "text-white/85" : "text-mute")}
                          >
                            {meta.blurb}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Basic Info & Media */}
                <div id="sec-banner" className="scroll-mt-24 neu-section p-5 space-y-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-accent">2. Name & Banner</p>

                  <EventNameMediaFields
                    name={name}
                    shortWhy={shortWhy}
                    coverImage={coverImage}
                    themeColor={themeColor}
                    coverOptionalLabel
                    nameRequired
                    nameError={nameError}
                    onName={(val) => {
                      setName(val);
                      if (!nameTouched && val.trim().length === 0) setNameTouched(true);
                    }}
                    onNameBlur={() => setNameTouched(true)}
                    onShortWhy={setShortWhy}
                    onCoverImage={setCoverImage}
                    onThemeColor={setThemeColor}
                  />
                </div>

                {/* Google Place & Location Pinning */}
                {/* Venue & Location Mode Capsule */}
                <div id="sec-venue" className="scroll-mt-24 neu-section p-5 space-y-4">
                  <EventVenueFields
                    title="3. Venue & Location"
                    locationType={locationType}
                    venue={venue}
                    address={address}
                    city={city}
                    room={room}
                    geo={geo}
                    virtualUrl={virtualUrl}
                    mapName={name}
                    datalistId="event-cities"
                    onLocationType={setLocationType}
                    onVenue={setVenue}
                    onAddress={setAddress}
                    onCity={setCity}
                    onRoom={setRoom}
                    onVirtualUrl={setVirtualUrl}
                    onGeo={setGeo}
                  />
                  <div>
                    <label
                      htmlFor="event-directions"
                      className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block"
                    >
                      Finding the group <span className="normal-case font-medium">(optional)</span>
                    </label>
                    <textarea
                      id="event-directions"
                      value={directions}
                      onChange={(e) => setDirections(e.target.value)}
                      maxLength={300}
                      rows={2}
                      placeholder="e.g. Take the lift to Level 4 and meet at the bar from 6pm"
                      className="neu-inset w-full p-3 text-[16px] sm:text-sm outline-none transition focus:ring-2 focus:ring-brand/20 placeholder:text-mute/60 resize-none leading-relaxed"
                    />
                  </div>
                </div>

                {/* Schedule & Timing */}
                <div id="sec-schedule" className="scroll-mt-24 neu-section p-5 space-y-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-accent">4. Date & Times</p>

                  <EventScheduleQuickPicks
                    onSelect={({ startsLocal: s, endsLocal: e }) => {
                      setStartsLocal(s);
                      setEndsLocal(e);
                      toast.success("Schedule shortcut applied");
                    }}
                  />

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="event-starts-at"
                        className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block"
                      >
                        Starts At
                      </label>
                      <input
                        id="event-starts-at"
                        type="datetime-local"
                        value={startsLocal}
                        onChange={(e) => setStartsLocal(e.target.value)}
                        required
                        className="neu-inset h-12 w-full px-4 text-[16px] sm:text-sm outline-none transition focus:ring-2 focus:ring-brand/20"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="event-ends-at"
                        className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block"
                      >
                        Ends At
                      </label>
                      <input
                        id="event-ends-at"
                        type="datetime-local"
                        value={endsLocal}
                        onChange={(e) => setEndsLocal(e.target.value)}
                        className="neu-inset h-12 w-full px-4 text-[16px] sm:text-sm outline-none transition focus:ring-2 focus:ring-brand/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">
                      Repeat
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[1, 2, 4, 8, 12].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setRepeatCount(n)}
                          aria-pressed={repeatCount === n}
                          className={
                            repeatCount === n
                              ? "min-h-[44px] rounded-full bg-brand px-4 py-2 text-xs font-bold text-white shadow-sm whitespace-nowrap"
                              : "neu-btn min-h-[44px] px-4 py-2 text-xs font-semibold text-mute hover:text-ink whitespace-nowrap"
                          }
                        >
                          {n === 1 ? "Once" : `Weekly × ${n}`}
                        </button>
                      ))}
                    </div>
                    {repeatCount > 1 && (
                      <p className="mt-1.5 text-[11px] text-mute">
                        Creates {repeatCount} weekly instances — each manageable on its own.
                      </p>
                    )}
                  </div>
                </div>

                {/* Host & Collaborators Section */}
                <div id="sec-host" className="scroll-mt-24 neu-section p-5 space-y-4">
                  <EventHostFields
                    title="5. Host & Collaborators"
                    hostType={hostType}
                    hostName={hostName}
                    hostHandle={hostHandle}
                    collaboratorHandles={collaboratorHandles}
                    collaboratorInput={collaboratorInput}
                    onHostType={setHostType}
                    onHostName={setHostName}
                    onHostHandle={setHostHandle}
                    onCollaboratorInput={setCollaboratorInput}
                    onAddCollaborator={addCollaborator}
                    onRemoveCollaborator={removeCollaborator}
                    sponsorHandles={sponsorHandles}
                    sponsorInput={sponsorInput}
                    onSponsorInput={setSponsorInput}
                    onAddSponsor={addSponsor}
                    onRemoveSponsor={removeSponsor}
                  />
                </div>

                {/* Rich Description Option with Luma Starter Prompts */}
                <div id="sec-story" className="scroll-mt-24 neu-section p-5 space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-bold uppercase tracking-wider text-accent">
                      6. Event Description & Story
                    </p>
                    <span className="text-[11px] text-mute">{description.length}/1000</span>
                  </div>

                  <EventDescriptionFields
                    description={description}
                    onDescription={setDescription}
                    placeholder="Describe your market, expo, or gathering. What can attendees expect? Highlight special guests, parking tips, food & drink, entry details…"
                  />
                  <EventAgendaFields rows={agenda} onChange={setAgenda} />
                </div>

                {/* Publish Status */}
                <div id="sec-status" className="scroll-mt-24 neu-section p-5 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-accent">7. Status & Tickets</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(
                      [
                        ["live", "Go live now · Public Gate QR active"],
                        ["draft", "Save as draft · Private preview"],
                      ] as const
                    ).map(([id, label]) => {
                      const on = status === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          aria-pressed={on}
                          onClick={() => setStatus(id)}
                          className={cn(
                            "min-h-[44px] rounded-2xl px-4 py-3 text-xs sm:text-sm font-semibold transition text-left",
                            on ? "bg-brand text-white shadow-sm" : "neu-btn text-mute hover:text-ink",
                          )}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <label className="flex items-start gap-3 neu-card p-3.5 cursor-pointer transition-[box-shadow,transform]">
                    <input
                      type="checkbox"
                      checked={registrationClosed}
                      onChange={(e) => setRegistrationClosed(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded text-brand focus:ring-brand accent-brand cursor-pointer"
                    />
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-ink">Close registration now</span>
                      <span className="block text-[11px] text-mute leading-relaxed">
                        Guests see “Registration Closed” with a notify-me form instead of ticket options.
                      </span>
                    </div>
                  </label>
                </div>

                <EventFestivalFields values={festivalFields} onChange={setFestivalFields} />

                <EventTicketFields values={ticketFields} onChange={setTicketFields} />

                <div className="neu-section p-5 space-y-3">
                  <label
                    htmlFor="event-refund-policy"
                    className="text-xs font-bold uppercase tracking-wider text-accent block"
                  >
                    Refunds & Transfers <span className="text-mute normal-case font-medium">(optional)</span>
                  </label>
                  <textarea
                    id="event-refund-policy"
                    value={refundPolicy}
                    onChange={(e) => setRefundPolicy(e.target.value)}
                    maxLength={500}
                    rows={2}
                    placeholder="e.g. No refunds, but tickets are transferable — message us to swap the name over."
                    className="neu-inset w-full p-3 text-[16px] sm:text-sm outline-none transition focus:ring-2 focus:ring-brand/20 placeholder:text-mute/60 resize-none leading-relaxed"
                  />
                </div>

                {/* Guest Screening & Approval Mode (Luma-style) */}
                <div className="neu-section p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                        <ShieldCheck size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-ink">Guest Screening</p>
                        <p className="text-[11px] text-mute">Review and approve attendees before passes unlock</p>
                      </div>
                    </div>
                  </div>

                  <label className="flex items-start gap-3 neu-card p-3.5 cursor-pointer group transition-[box-shadow,transform]">
                    <input
                      type="checkbox"
                      checked={requireApproval}
                      onChange={(e) => {
                        setRequireApproval(e.target.checked);
                        toast.success(
                          e.target.checked ? "Enabled host approval requirement" : "Disabled host approval requirement",
                        );
                      }}
                      className="mt-0.5 h-4 w-4 rounded text-brand focus:ring-brand accent-brand cursor-pointer"
                    />
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-ink group-hover:text-accent transition">
                        Require Host Approval for Registrations
                      </span>
                      <p className="text-[11px] text-mute leading-relaxed">
                        Curate your attendee roster. Guests request to join, and you confirm them from your live
                        guestlist before dynamic QR tickets and passes are issued.
                      </p>
                    </div>
                  </label>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-12 text-base font-semibold shadow-md gap-2"
                  disabled={creating || name.trim().length < 2}
                >
                  <span>
                    {creating ? "Creating Event…" : status === "draft" ? "Save Draft" : "Create Event & Open Gate"}
                  </span>
                  <ArrowRight size={18} />
                </Button>
              </motion.form>
            </div>

            {/* Right: Sticky Live Attendee Preview Card */}
            <div
              className={cn(
                "lg:col-span-5 lg:sticky lg:top-6 space-y-3",
                mobilePreview ? "block mt-4 lg:mt-0" : "hidden lg:block",
              )}
            >
              <EventLivePreviewCard
                title={name}
                coverImage={coverImage}
                flavour={flavour}
                shortWhy={shortWhy}
                description={description}
                startsAt={fromLocalInput(startsLocal)}
                endsAt={fromLocalInput(endsLocal)}
                venue={venue}
                address={address}
                city={city}
                geo={geo}
                locationType={locationType}
                virtualUrl={virtualUrl}
                requireApproval={requireApproval}
                themeColor={themeColor}
                hostName={hostName}
                hostHandle={hostHandle}
                hostType={hostType}
                collaboratorHandles={collaboratorHandles}
                ticketPriceCents={ticketFields.paid ? Math.round(Number(ticketFields.price || 0) * 100) : 0}
                capacity={Number(ticketFields.capacity) || undefined}
              />

              {mobilePreview && (
                <Button
                  type="button"
                  variant="ghost"
                  className="neu-btn w-full lg:hidden h-11 text-xs font-bold"
                  onClick={() => setMobilePreview(false)}
                >
                  Back to Editing Form
                </Button>
              )}
            </div>
          </div>
        </motion.div>

        <EventCreatedCelebrationModal
          open={Boolean(celebrationEventId)}
          onClose={() => {
            setCelebrationEventId(null);
            setTab("today");
          }}
          eventId={celebrationEventId || ""}
          name={celebrationEventName || name}
          flavour={flavour}
          venue={venue}
          city={city}
          onOpenStalls={() => setTab("stalls")}
        />
      </div>
    );
  }

  // ACTIVE EVENT MANAGEMENT WORKSPACE (unreachable in demo mode: demo always renders create).
  if (!activeEvent) return null;
  const whenLabel = [formatWhen(activeEvent.startsAt), formatWhen(activeEvent.endsAt)].filter(Boolean).join(" → ");

  return (
    <div className="relative isolate overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-[-6rem] h-64 w-64 rounded-full bg-brand/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 top-28 h-56 w-56 rounded-full bg-gold/15 blur-3xl"
      />

      <div data-theme="light" className="relative mx-auto max-w-4xl bg-paper px-4 pb-24 pt-4">
        {/* Breadcrumb Navigation Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/pass"
              className="neu-btn inline-flex min-h-[44px] items-center gap-1.5 px-3.5 text-xs font-semibold text-mute hover:text-ink transition whitespace-nowrap"
            >
              <ArrowLeft size={13} className="shrink-0" />
              <span>AirPal Pass</span>
            </Link>
            <Link
              href="/events"
              className="neu-btn inline-flex min-h-[44px] items-center gap-1 px-3.5 text-xs font-semibold text-mute hover:text-ink transition whitespace-nowrap"
            >
              <span>Browse Events</span>
            </Link>
            <Link
              href="/business"
              className="neu-btn inline-flex min-h-[44px] items-center gap-1.5 px-3.5 text-xs font-semibold text-mute hover:text-ink transition whitespace-nowrap"
            >
              <Building2 size={13} className="shrink-0 text-accent" />
              <span>Business Hub</span>
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={startNewEventDraft}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-brand text-white px-3.5 text-xs font-bold shadow-xs hover:bg-brand-ink transition whitespace-nowrap"
            >
              <Plus size={14} className="shrink-0" />
              <span>Create New Event</span>
            </button>
            <Link
              href={`/e/${activeEvent.id}`}
              className="neu-btn inline-flex min-h-[44px] items-center gap-1.5 px-3.5 text-xs font-semibold text-ink transition whitespace-nowrap"
            >
              <Eye size={13} className="shrink-0 text-accent" />
              <span>Public Page</span>
            </Link>
            <Link
              href={`/e/${activeEvent.id}/guests`}
              className="neu-btn inline-flex min-h-[44px] items-center gap-1.5 px-3.5 text-xs font-semibold text-accent transition whitespace-nowrap"
            >
              <Users size={13} className="shrink-0" />
              <span>Door Guestlist</span>
            </Link>
            <Link
              href="/scan"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 px-3.5 text-xs font-bold shadow-xs hover:opacity-90 transition whitespace-nowrap"
            >
              <QrCode size={13} className="shrink-0" />
              <span>Door Scanner</span>
            </Link>
          </div>
        </div>

        {/* Multi-Event Switcher Strip when organiser has > 1 event */}
        {myEvents.length > 1 && (
          <div className="mb-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar neu-inset p-2">
            <span className="px-2 text-[11px] font-bold uppercase tracking-wider text-mute shrink-0">
              Your Events ({myEvents.length}):
            </span>
            {myEvents.map((ev) => {
              const isCurrent = ev.id === activeEvent.id;
              return (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => {
                    setSelectedEventId(ev.id);
                    setCreatingNew(false);
                  }}
                  className={cn(
                    "min-h-[44px] shrink-0 rounded-xl px-3 text-xs font-semibold transition whitespace-nowrap",
                    isCurrent ? "bg-brand text-white shadow-xs" : "neu-chip text-mute hover:text-ink",
                  )}
                >
                  {ev.name}
                  {ev.recurrenceIndex ? ` (#${ev.recurrenceIndex})` : ""}
                </button>
              );
            })}
          </div>
        )}

        {/* Top Header Card */}
        <div className="neu-section p-5 overflow-hidden relative">
          {activeEvent.coverImage && (
            <div className="h-32 -mx-5 -mt-5 mb-4 relative overflow-hidden">
              <Photo src={activeEvent.coverImage} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
                  {EVENT_FLAVOUR_LABELS[activeEvent.flavour]}
                </p>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                    activeEvent.status === "live"
                      ? "bg-emerald-500/10 text-emerald-700"
                      : activeEvent.status === "draft"
                        ? "bg-amber-500/10 text-amber-800"
                        : "bg-paper text-mute",
                  )}
                >
                  {activeEvent.status}
                </span>
                {activeEvent.mapsPlaceId && (
                  <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
                    Google Place
                  </span>
                )}
                {activeEvent.seriesId && activeEvent.recurrenceIndex && activeEvent.recurrenceCount && (
                  <span className="neu-chip neu-tint-brand px-2 py-0.5 text-[10px] font-semibold text-accent">
                    Weekly {activeEvent.recurrenceIndex} of {activeEvent.recurrenceCount}
                  </span>
                )}
              </div>
              <h1 className="human-title mt-1 text-2xl sm:text-3xl text-balance">{activeEvent.name}</h1>
              {activeEvent.shortWhy && <p className="text-sm text-mute mt-0.5">{activeEvent.shortWhy}</p>}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="neu-btn min-h-[44px] gap-1.5 text-xs font-semibold whitespace-nowrap"
                onClick={() => nav(activeEvent.gatePath)}
              >
                <ExternalLink size={13} className="shrink-0 text-accent" />
                <span>Guest Directory</span>
              </Button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-mute pt-3">
            {whenLabel && (
              <span className="inline-flex items-center gap-1.5 font-medium text-ink">
                <CalendarDays size={14} className="text-accent" />
                {whenLabel}
              </span>
            )}
            {(activeEvent.venue || activeEvent.city || activeEvent.address) && (
              <span className="inline-flex items-center gap-1.5 text-mute">
                <MapPin size={14} className="text-accent" />
                {[activeEvent.venue, activeEvent.city].filter(Boolean).join(" · ")}
              </span>
            )}
          </div>

          {isLocalOnly && (
            <div className="mt-4 rounded-2xl bg-amber-500/10 p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="text-amber-500 shrink-0" size={18} />
                <div>
                  <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                    Not Published Live on AirPal Cloud
                  </p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300">
                    This event is only saved in this browser. Anyone opening the link on another device will see a 404
                    Not Found error.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                className="min-h-[44px] text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                loading={publishing}
                onClick={handlePublishLive}
              >
                Publish to AirPal Live
              </Button>
            </div>
          )}
        </div>

        {/* Tab Navigation Pill Bar — sticky & horizontally scrollable on mobile so 5 tabs never crush */}
        <div className="sticky top-2 z-20 mt-5 flex overflow-x-auto no-scrollbar neu-inset p-1.5 gap-1">
          {(
            [
              { id: "today", label: "Overview", icon: LayoutGrid, count: undefined },
              {
                id: "stalls",
                label: stallFieldLabels(activeEvent.flavour).listNoun,
                icon: Store,
                count: stalls.length,
              },
              { id: "print", label: "Gate QR", icon: QrCode, count: undefined },
              { id: "manage", label: "Manage", icon: Users, count: undefined },
              { id: "settings", label: "Settings & Location", icon: Edit3, count: undefined },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "flex shrink-0 px-3.5 sm:flex-1 sm:px-2 items-center justify-center gap-1.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-semibold capitalize transition active:scale-95 whitespace-nowrap",
                tab === item.id ? "bg-brand text-white shadow-sm" : "text-mute hover:text-ink hover:bg-white/50",
              )}
            >
              <item.icon size={15} className="shrink-0" />
              <span>{item.label}</span>
              {typeof item.count === "number" && item.count > 0 && (
                <span
                  className={cn(
                    "ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                    tab === item.id ? "bg-white/25 text-white" : "neu-chip text-mute",
                  )}
                >
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* TAB 1: OVERVIEW / TODAY */}
        {tab === "today" && (
          <div className="mt-5 space-y-4">
            <HostFreshnessBanner
              kind="events"
              at={activeEvent.scheduleVerifiedAt || activeEvent.updatedAt}
              onConfirm={async () => {
                await confirmEventSchedule();
                toast.success("Schedule confirmed");
              }}
            />

            {/* Live Attendee Page Link Card */}
            <div className="neu-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-0.5 text-[11px] font-bold text-accent uppercase tracking-wider">
                  <Eye size={12} />
                  <span>Public Event Page</span>
                </span>
                <h3 className="font-display text-lg font-bold text-ink">Attendee Hub &amp; Passbook Gate</h3>
                <p className="text-xs text-mute leading-relaxed max-w-md">
                  View your event exactly as attendees see it: ambient glow cover, calendar block, Apple Wallet passbook
                  checkout, and host bio.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Link
                  href={`/e/${activeEvent.id}`}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-brand text-white px-4 text-xs font-bold shadow-md hover:bg-brand/90 transition active:scale-95"
                >
                  <ExternalLink size={14} />
                  <span>View Public Page</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setTab("manage")}
                  className="neu-btn inline-flex min-h-[44px] items-center gap-1.5 px-4 text-xs font-semibold text-ink transition"
                >
                  <Users size={14} className="text-accent" />
                  <span>Day-of Ops</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="neu-card p-5 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-mute">Directory Supply</p>
                  <p className="font-display text-3xl sm:text-4xl font-bold mt-1 text-ink">{stalls.length}</p>
                  <p className="text-xs capitalize text-mute mt-0.5">
                    {stallFieldLabels(activeEvent.flavour).listNoun} live
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="tonal"
                  className="mt-3 text-xs min-h-[40px]"
                  onClick={() => setTab("stalls")}
                >
                  Manage {stallFieldLabels(activeEvent.flavour).listNoun}
                </Button>
              </div>

              <div className="neu-card p-5 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-mute">Entrance QR</p>
                  <p className="text-xs text-ink font-semibold mt-1 truncate">{activeEvent.gatePath}</p>
                  <p className="text-xs text-mute mt-0.5">Scan at gate for live directory</p>
                </div>
                <Button size="sm" variant="tonal" className="mt-3 text-xs min-h-[40px]" onClick={() => setTab("print")}>
                  Print Entrance QR
                </Button>
              </div>

              <div className="neu-card p-5 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-mute">Guestlist</p>
                  <p className="font-display text-3xl sm:text-4xl font-bold mt-1 text-ink">
                    {(activeEvent as { guestCounts?: { goingHeads?: number } }).guestCounts?.goingHeads ?? "–"}
                  </p>
                  <p className="text-xs text-mute mt-0.5">Going heads, live from the list</p>
                </div>
                <Button
                  size="sm"
                  variant="tonal"
                  className="mt-3 text-xs min-h-[40px]"
                  onClick={() => nav(`/e/${activeEvent.id}/guests`)}
                >
                  Open guestlist
                </Button>
              </div>
            </div>

            {/* Description Preview Card */}
            {activeEvent.description && (
              <div className="neu-card p-5 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
                  <FileText size={14} /> Description & Guest Story
                </p>
                <p className="text-xs sm:text-sm text-ink/85 leading-relaxed whitespace-pre-line">
                  {activeEvent.description}
                </p>
              </div>
            )}

            {/* Growth Campaign Banner */}
            <button
              type="button"
              onClick={() => nav("/business/promotions")}
              className="flex w-full items-center justify-between gap-3 rounded-3xl bg-neutral-900 p-5 text-left text-white shadow-md hover:bg-black transition active:scale-[0.99]"
            >
              <div>
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400">
                  <Sparkles size={14} /> Need a bigger crowd?
                </span>
                <span className="block text-sm font-semibold mt-1">
                  Fund an Experience Campaign — AirPal drives verified foot traffic.
                </span>
              </div>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white shrink-0">
                <ArrowRight size={16} />
              </span>
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Button className="h-12 font-semibold" onClick={() => nav(activeEvent.gatePath)}>
                Open Live Guest Directory
              </Button>
              <Button variant="ghost" className="neu-btn h-12 font-semibold" onClick={() => setTab("stalls")}>
                {stallFieldLabels(activeEvent.flavour).addTitle}
              </Button>
              <Button variant="ghost" className="neu-btn h-12 font-semibold" onClick={() => setTab("settings")}>
                Edit Event &amp; Tickets
              </Button>
            </div>
          </div>
        )}

        {/* TAB 2: STALLS & EXHIBITORS */}
        {tab === "stalls" && (
          <div className="mt-5 space-y-4">
            {(() => {
              const labels = stallFieldLabels(activeEvent.flavour);
              return (
                <>
                  <form className="space-y-3 neu-card p-5" onSubmit={onAddStall}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-display text-lg font-bold text-ink">
                          {editingStallId ? "Edit Listing" : labels.addTitle}
                        </h2>
                        <p className="text-xs text-mute">
                          Add makers, food stalls, or exhibitor booths. Displayed in real-time on the guest directory.
                        </p>
                      </div>
                      {editingStallId && (
                        <button
                          type="button"
                          className="neu-btn inline-flex min-h-[44px] items-center px-3 py-1 text-xs font-bold text-rose-600"
                          onClick={resetStallForm}
                        >
                          Cancel Edit
                        </button>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="stall-name"
                        className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block"
                      >
                        {labels.business}
                      </label>
                      <input
                        id="stall-name"
                        value={stallName}
                        onChange={(e) => setStallName(e.target.value)}
                        placeholder={labels.businessPlaceholder}
                        required
                        className="neu-inset h-12 w-full px-4 text-[16px] sm:text-sm outline-none transition focus:ring-2 focus:ring-brand/20"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="stall-unit"
                          className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block"
                        >
                          {labels.unit}
                        </label>
                        <input
                          id="stall-unit"
                          value={booth}
                          onChange={(e) => setBooth(e.target.value)}
                          placeholder={labels.unitPlaceholder}
                          className="neu-inset h-12 w-full px-4 text-[16px] sm:text-sm outline-none transition focus:ring-2 focus:ring-brand/20"
                        />
                      </div>
                      <StallHandleField
                        value={stallHandle}
                        onChange={setStallHandle}
                        onAutofillName={(name) => {
                          if (!stallName.trim()) {
                            setStallName(name);
                            toast.success("Filled stall name from profile");
                          }
                        }}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="stall-location"
                        className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block"
                      >
                        Floor location (Optional)
                      </label>
                      <input
                        id="stall-location"
                        value={stallLocation}
                        onChange={(e) => setStallLocation(e.target.value)}
                        placeholder="e.g. Aisle C · Bay 12, near Gate B"
                        maxLength={120}
                        className="neu-inset h-12 w-full px-4 text-[16px] sm:text-sm outline-none transition focus:ring-2 focus:ring-brand/20 placeholder:text-mute/60"
                      />
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5">Category</p>
                      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Stall category">
                        {STALL_CATEGORIES.map((c) => {
                          const on = stallCategory === c.id;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              aria-pressed={on}
                              onClick={() => setStallCategory(c.id)}
                              className={cn(
                                "min-h-[44px] rounded-full px-3 text-xs font-semibold transition active:scale-95",
                                on ? "bg-brand text-white shadow-xs" : "neu-btn text-mute hover:text-ink",
                              )}
                            >
                              {c.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="stall-about"
                        className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block"
                      >
                        {labels.about}
                      </label>
                      <input
                        id="stall-about"
                        value={stallWhy}
                        onChange={(e) => setStallWhy(e.target.value)}
                        placeholder="One-line summary guests see (e.g. Handmade ceramic cups & vases)"
                        className="neu-inset h-12 w-full px-4 text-[16px] sm:text-sm outline-none transition focus:ring-2 focus:ring-brand/20"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="stall-offer"
                        className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block"
                      >
                        Exclusive Guest Offer (Optional)
                      </label>
                      <input
                        id="stall-offer"
                        value={stallOffer}
                        onChange={(e) => setStallOffer(e.target.value)}
                        placeholder="e.g. Free espresso with bag of beans, or 10% off"
                        className="neu-inset h-12 w-full px-4 text-[16px] sm:text-sm outline-none transition focus:ring-2 focus:ring-brand/20"
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-11 font-semibold shadow-xs"
                      disabled={addingStall}
                      loading={addingStall}
                    >
                      {addingStall ? "Saving Stall…" : editingStallId ? "Save Stall Changes" : labels.addTitle}
                    </Button>
                  </form>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <label className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-neutral-900 text-xs sm:text-sm font-semibold text-white hover:bg-black transition shadow-xs">
                      <Upload size={15} />
                      Import CSV Directory
                      <input
                        type="file"
                        accept=".csv,text/csv"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void onCsv(file);
                        }}
                      />
                    </label>
                    <Button
                      variant="ghost"
                      className="neu-btn flex-1 h-11 text-xs sm:text-sm font-semibold"
                      type="button"
                      onClick={() => {
                        const blob = new Blob([stallCsvTemplate(activeEvent.flavour)], {
                          type: "text/csv;charset=utf-8",
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `airpal-${activeEvent.flavour}-directory.csv`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                    >
                      <Download size={15} />
                      Download CSV Template
                    </Button>
                  </div>

                  {stalls.length === 0 ? (
                    <div className="neu-inset px-4 py-8 text-center text-xs text-mute">{labels.empty}</div>
                  ) : (
                    <ul className="space-y-2">
                      {stalls.map((s) => (
                        <li key={s.id}>
                          <button
                            type="button"
                            onClick={() => editStall(s)}
                            className="w-full neu-card px-4 py-3.5 text-left transition group"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-mute font-medium">
                                {stallUnitDisplay(activeEvent.flavour, s.booth)}
                                {" · "}
                                {STALL_CATEGORIES.find((c) => c.id === s.category)?.label || s.category}
                                {s.handle ? ` · @${s.handle}` : ""}
                              </span>
                              <span className="text-[11px] font-semibold text-accent group-hover:underline">Edit</span>
                            </div>
                            <p className="font-semibold text-sm text-ink mt-0.5">{s.name}</p>
                            {s.shortWhy && <p className="text-xs text-mute">{s.shortWhy}</p>}
                            {s.offer && <p className="text-xs font-semibold text-accent mt-1">🏷️ {s.offer}</p>}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* TAB 3: PRINT GATE QR */}
        {tab === "print" && (
          <div className="mt-5 neu-section p-6 text-center space-y-4">
            <span className="neu-tint-brand mx-auto grid h-14 w-14 place-items-center rounded-2xl text-accent">
              <QrCode size={26} />
            </span>
            <div>
              <h2 className="font-display text-2xl font-bold text-ink">Entrance Gate QR Code</h2>
              <p className="mt-1 text-xs text-mute max-w-sm mx-auto">
                Print and display this QR code at your entrance gate, registration desk, or tables. Attendees scan
                directly into your live directory.
              </p>
            </div>

            {qr ? (
              <div className="relative inline-block rounded-3xl bg-white p-4 shadow-md">
                <img src={qr} alt={`QR code for ${activeEvent.name}`} className="mx-auto h-52 w-52" />
              </div>
            ) : (
              <div className="mx-auto h-52 w-52 animate-pulse rounded-3xl bg-paper" />
            )}

            <div>
              <p className="font-mono text-xs text-ink font-semibold">
                {publicSiteOrigin()}
                {activeEvent.gatePath}
              </p>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
              <Button
                variant="primary"
                className="flex-1 h-11 font-semibold gap-1.5 shadow-sm"
                disabled={!qr}
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = qr;
                  a.download = `${activeEvent.name.toLowerCase().replace(/\s+/g, "-")}-gate-qr.png`;
                  a.click();
                }}
              >
                <Download size={15} />
                <span>Download PNG</span>
              </Button>
              <Button
                variant="ghost"
                className="neu-btn flex-1 h-11 font-semibold gap-1.5"
                onClick={() => {
                  void navigator.clipboard.writeText(`${publicSiteOrigin()}${activeEvent.gatePath}`).then(
                    () => toast.success("Gate directory link copied"),
                    () => toast.error("Couldn’t copy link"),
                  );
                }}
              >
                <Copy size={15} />
                <span>Copy Link</span>
              </Button>
            </div>
          </div>
        )}

        {/* TAB 4: MANAGE — day-of operations (guestlist, scanner, invites, clone, cancel) */}
        {tab === "manage" && <EventManagePanel event={activeEvent} />}

        {/* TAB 5: SETTINGS, LOCATION & DESCRIPTION */}
        {tab === "settings" && (
          <form className="mt-5 space-y-5 neu-section p-5 sm:p-6" onSubmit={onSaveSettings}>
            <div>
              <h2 className="font-display text-xl font-bold text-ink">Event Details, Google Place & Description</h2>
              <p className="text-xs text-mute mt-0.5">
                Update venue pinning, description story, schedule, banner, and publishing status.
              </p>
            </div>

            {/* Event Name & Short Tagline */}
            <div className="space-y-4 pt-2">
              <EventNameMediaFields
                name={name}
                shortWhy={shortWhy}
                coverImage={coverImage}
                themeColor={themeColor}
                nameRequired
                nameError={nameError}
                onName={(val) => {
                  setName(val);
                  if (!nameTouched && val.trim().length === 0) setNameTouched(true);
                }}
                onNameBlur={() => setNameTouched(true)}
                onShortWhy={setShortWhy}
                onCoverImage={setCoverImage}
                onThemeColor={setThemeColor}
              />
            </div>

            {/* Flavour Format */}
            <div className="pt-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-mute mb-2">Event Format</p>
              <div className="flex flex-wrap gap-2">
                {EVENT_FLAVOURS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={flavour === id}
                    onClick={() => setFlavour(id)}
                    className={cn(
                      "min-h-[44px] rounded-full px-4 text-xs font-semibold transition active:scale-95",
                      flavour === id ? "bg-brand text-white shadow-xs" : "neu-btn text-mute hover:text-ink",
                    )}
                  >
                    {EVENT_FLAVOUR_LABELS[id]}
                  </button>
                ))}
              </div>
            </div>

            {/* Venue & Location Mode Capsule in Settings */}
            <div className="space-y-4 pt-2">
              <EventVenueFields
                title="Venue & Location Mode"
                locationType={locationType}
                venue={venue}
                address={address}
                city={city}
                room={room}
                geo={geo}
                virtualUrl={virtualUrl}
                mapName={name}
                datalistId="event-cities-edit"
                showRoom
                onLocationType={setLocationType}
                onVenue={setVenue}
                onAddress={setAddress}
                onCity={setCity}
                onRoom={setRoom}
                onVirtualUrl={setVirtualUrl}
                onGeo={setGeo}
              />
              <div>
                <label
                  htmlFor="event-directions-edit"
                  className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block"
                >
                  Finding the group <span className="normal-case font-medium">(optional)</span>
                </label>
                <textarea
                  id="event-directions-edit"
                  value={directions}
                  onChange={(e) => setDirections(e.target.value)}
                  maxLength={300}
                  rows={2}
                  placeholder="e.g. Take the lift to Level 4 and meet at the bar from 6pm"
                  className="neu-inset w-full p-3 text-[16px] sm:text-sm outline-none transition focus:ring-2 focus:ring-brand/20 placeholder:text-mute/60 resize-none leading-relaxed"
                />
              </div>
            </div>

            {/* Host & Collaborators Section */}
            <div className="space-y-4 pt-2">
              <EventHostFields
                title="Host & Collaborators"
                hostType={hostType}
                hostName={hostName}
                hostHandle={hostHandle}
                collaboratorHandles={collaboratorHandles}
                collaboratorInput={collaboratorInput}
                onHostType={setHostType}
                onHostName={setHostName}
                onHostHandle={setHostHandle}
                onCollaboratorInput={setCollaboratorInput}
                onAddCollaborator={addCollaborator}
                onRemoveCollaborator={removeCollaborator}
                sponsorHandles={sponsorHandles}
                sponsorInput={sponsorInput}
                onSponsorInput={setSponsorInput}
                onAddSponsor={addSponsor}
                onRemoveSponsor={removeSponsor}
              />
            </div>

            {/* Rich Description & Story Option with Luma Starters */}
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center">
                <p className="text-xs font-bold uppercase tracking-wider text-accent">Event Description & Details</p>
                <span className="text-[11px] text-mute">{description.length}/1000</span>
              </div>

              <EventDescriptionFields
                description={description}
                onDescription={setDescription}
                placeholder="Detailed event information for attendees: what to see, parking & public transport directions, timetable, food options, special exhibitors…"
              />
              <EventAgendaFields rows={agenda} onChange={setAgenda} />
            </div>

            {/* Dates & Schedule */}
            <div className="grid gap-3 sm:grid-cols-2 pt-2">
              <div>
                <label
                  htmlFor="event-starts-at-edit"
                  className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block"
                >
                  Starts At
                </label>
                <input
                  id="event-starts-at-edit"
                  type="datetime-local"
                  value={startsLocal}
                  onChange={(e) => setStartsLocal(e.target.value)}
                  className="neu-inset h-12 w-full px-4 text-[16px] sm:text-sm outline-none transition focus:ring-2 focus:ring-brand/20"
                />
              </div>
              <div>
                <label
                  htmlFor="event-ends-at-edit"
                  className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block"
                >
                  Ends At
                </label>
                <input
                  id="event-ends-at-edit"
                  type="datetime-local"
                  value={endsLocal}
                  onChange={(e) => setEndsLocal(e.target.value)}
                  className="neu-inset h-12 w-full px-4 text-[16px] sm:text-sm outline-none transition focus:ring-2 focus:ring-brand/20"
                />
              </div>
            </div>

            {/* Status */}
            <div className="pt-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-mute mb-2">Publishing Status</p>
              <div className="grid grid-cols-3 gap-2">
                {(["live", "draft", "ended"] as const).map((id) => {
                  const on = status === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setStatus(id)}
                      className={cn(
                        "min-h-[44px] rounded-2xl px-3 py-2.5 text-xs font-semibold capitalize transition",
                        on ? "bg-brand text-white ring-brand shadow-xs" : "neu-btn text-mute hover:text-ink",
                      )}
                    >
                      {on && <Check size={12} className="mr-1 inline" />}
                      {id}
                    </button>
                  );
                })}
              </div>
              <label className="mt-2 flex items-start gap-3 neu-card p-3 cursor-pointer transition-[box-shadow,transform]">
                <input
                  type="checkbox"
                  checked={registrationClosed}
                  onChange={(e) => setRegistrationClosed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded text-brand focus:ring-brand accent-brand cursor-pointer"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-ink">Close registration now</span>
                  <span className="block text-[11px] text-mute leading-relaxed">
                    Guests see “Registration Closed” with a notify-me form instead of ticket options.
                  </span>
                </div>
              </label>
            </div>

            <EventFestivalFields values={festivalFields} onChange={setFestivalFields} />

            <EventTicketFields values={ticketFields} onChange={setTicketFields} />

            <div className="pt-2">
              <label
                htmlFor="event-refund-policy-edit"
                className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block"
              >
                Refunds & Transfers <span className="normal-case font-medium">(optional)</span>
              </label>
              <textarea
                id="event-refund-policy-edit"
                value={refundPolicy}
                onChange={(e) => setRefundPolicy(e.target.value)}
                maxLength={500}
                rows={2}
                placeholder="e.g. No refunds, but tickets are transferable — message us to swap the name over."
                className="neu-inset w-full p-3 text-[16px] sm:text-sm outline-none transition focus:ring-2 focus:ring-brand/20 placeholder:text-mute/60 resize-none leading-relaxed"
              />
            </div>

            {activeEvent && <EventCouponManager eventId={activeEvent.id} />}

            {/* Guest Screening & Approval Mode in Settings */}
            <div className="neu-card p-4 space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="grid h-7 w-7 place-items-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  <ShieldCheck size={15} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-ink">Guest Screening</p>
                  <p className="text-[11px] text-mute">Require host approval for reservations</p>
                </div>
              </div>

              <label className="flex items-start gap-3 neu-card p-3 cursor-pointer group transition-[box-shadow,transform]">
                <input
                  type="checkbox"
                  checked={requireApproval}
                  onChange={(e) => {
                    setRequireApproval(e.target.checked);
                    toast.success(
                      e.target.checked ? "Enabled host approval requirement" : "Disabled host approval requirement",
                    );
                  }}
                  className="mt-0.5 h-4 w-4 rounded text-brand focus:ring-brand accent-brand cursor-pointer"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-ink group-hover:text-accent transition">
                    Require Host Approval for Registrations
                  </span>
                  <p className="text-[11px] text-mute leading-relaxed">
                    Attendees submit a request to join and are screened before dynamic tickets and gate passes are
                    issued.
                  </p>
                </div>
              </label>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold shadow-md"
              disabled={saving || name.trim().length < 2}
            >
              {saving ? "Saving Changes…" : "Save All Event Details"}
            </Button>
          </form>
        )}
      </div>

      <EventCreatedCelebrationModal
        open={Boolean(celebrationEventId)}
        onClose={() => {
          setCelebrationEventId(null);
          setTab("today");
        }}
        eventId={celebrationEventId || ""}
        name={celebrationEventName || name}
        flavour={flavour}
        venue={venue}
        city={city}
        onOpenStalls={() => setTab("stalls")}
      />
    </div>
  );
}
