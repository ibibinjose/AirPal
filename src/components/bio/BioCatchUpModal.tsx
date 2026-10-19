import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  Bell,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Coffee,
  Copy,
  ExternalLink,
  Loader2,
  MapPin,
  MessageSquare,
  PhoneCall,
  Sparkles,
  Users,
  Video,
  X,
  Zap,
} from "lucide-react";
import { Photo } from "@/components/ui/Photo";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";
import { useScrollLock } from "@/hooks/useScrollLock";
import { AddToCalendarMenu } from "@/components/calendar/AddToCalendarMenu";
import {
  persistCatchUp,
  recordCatchUpInterest,
  toggleCatchUpReminder,
  hasCatchUpReminder,
  checkTimeConflict,
  subscribeMyCatchUps,
  formatCatchUpTimeRange,
  type CatchUpItem,
  type CatchUpType,
} from "@/lib/catchup";
import { toZonedDateStr } from "@/lib/local-time";
import { triggerHaptic } from "@/lib/native";
import { toast } from "sonner";
import { scheduleCatchUpRemote } from "@/lib/functions";
import { dismissKeyboard } from "@/lib/keyboard";
import { cn } from "@/lib/cn";

interface BioCatchUpModalProps {
  open: boolean;
  onClose: () => void;
  handle: string;
  name: string;
  city?: string;
  avatar?: string;
  ownerUid?: string;
  initialType?: CatchUpType;
  defaultMeetingUrl?: string;
  defaultMeetingPlatform?: "in_person" | "google_meet" | "facetime" | "zoom";
}

function localDate(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return toZonedDateStr(d);
}

const DURATION_OPTIONS = [
  { mins: 15, label: "15m", sub: "Quick sync" },
  { mins: 30, label: "30m", sub: "Standard" },
  { mins: 45, label: "45m", sub: "Coffee" },
  { mins: 60, label: "1 hr", sub: "In-depth" },
  { mins: 120, label: "2 hr", sub: "Hangout" },
];

const HANGOUT_VIBES = [
  { id: "coffee", label: "Coffee walk", icon: "☕" },
  { id: "dinner", label: "Dinner & bites", icon: "🍽️" },
  { id: "drinks", label: "Drinks & bar", icon: "🍸" },
  { id: "gig", label: "Live gig / Music", icon: "🎵" },
  { id: "games", label: "Games & trivia", icon: "🎲" },
  { id: "cowork", label: "Co-working sync", icon: "💻" },
];

const VENUE_SHORTCUTS = ["Nearby Café", "The Rocks", "Circular Quay", "Central", "Surry Hills"];

export function BioCatchUpModal({
  open,
  onClose,
  handle,
  name,
  city = "Sydney",
  avatar,
  ownerUid,
  initialType = "catchup",
  defaultMeetingUrl,
  defaultMeetingPlatform,
}: BioCatchUpModalProps) {
  const { user, requireUser } = useAuth();
  const { mine } = useBio();
  const [selectedType, setSelectedType] = useState<CatchUpType>(initialType);
  const [durationMinutes, setDurationMinutes] = useState<number>(
    initialType === "nightout" ? 120 : initialType === "meeting" ? 30 : 45,
  );
  const [selectedVibe, setSelectedVibe] = useState<string>("");
  const [meetingPlatform, setMeetingPlatform] = useState<"in_person" | "google_meet" | "facetime" | "zoom">(
    "in_person",
  );
  const [meetingLink, setMeetingLink] = useState("");
  const [date, setDate] = useState(() => localDate(1));
  const [time, setTime] = useState("14:00");
  const [venue, setVenue] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRemembered, setIsRemembered] = useState(() => hasCatchUpReminder(handle));
  const [myCatchups, setMyCatchups] = useState<CatchUpItem[]>([]);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [submittedSummary, setSubmittedSummary] = useState<{
    typeLabel: string;
    date: string;
    time: string;
    durationMinutes: number;
    venue: string;
    activity?: string;
  } | null>(null);

  const handleClose = () => {
    void dismissKeyboard();
    setSubmittedSummary(null);
    onClose();
  };

  useScrollLock(open);

  useEffect(() => {
    if (!user?.uid) {
      setMyCatchups([]);
      return;
    }
    return subscribeMyCatchUps(user.uid, setMyCatchups);
  }, [user?.uid]);

  useEffect(() => {
    if (!open) return;
    setSelectedType(initialType);
    setDurationMinutes(initialType === "nightout" ? 120 : initialType === "meeting" ? 30 : 45);
    setSelectedVibe("");
    const resolvedPlatform: "in_person" | "google_meet" | "facetime" | "zoom" =
      defaultMeetingPlatform ||
      (initialType === "meeting" && defaultMeetingUrl
        ? defaultMeetingUrl.includes("facetime")
          ? "facetime"
          : defaultMeetingUrl.includes("zoom")
            ? "zoom"
            : "google_meet"
        : "in_person");
    setMeetingPlatform(resolvedPlatform);
    setMeetingLink(defaultMeetingUrl || "");
    setDate(localDate(1));
    setTime(initialType === "meeting" ? "10:00" : initialType === "nightout" ? "18:30" : "14:00");
    setVenue(city ? `${city}` : "");
    setNotes("");
    setIsRemembered(hasCatchUpReminder(handle));
    setSubmittedSummary(null);

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, initialType, handle, city, defaultMeetingUrl, defaultMeetingPlatform]);

  const typeOptions: Array<{
    type: CatchUpType;
    label: string;
    sublabel: string;
    icon: typeof Coffee;
    badge: string;
    color: string;
  }> = [
    {
      type: "catchup",
      label: "Catch Up",
      sublabel: "1-on-1 coffee",
      icon: Coffee,
      badge: "1-on-1",
      color: "from-amber-500/20 to-orange-500/20 text-amber-600 border-amber-500/30",
    },
    {
      type: "meeting",
      label: "Meeting",
      sublabel: "1-on-1 sync",
      icon: Calendar,
      badge: "1-on-1",
      color: "from-sky-500/20 to-blue-500/20 text-sky-600 border-sky-500/30",
    },
    {
      type: "nightout",
      label: "Hangout",
      sublabel: "Group catch-up",
      icon: Users,
      badge: "Group",
      color: "from-purple-500/20 to-pink-500/20 text-purple-600 border-purple-500/30",
    },
  ];

  const currentOption = typeOptions.find((o) => o.type === selectedType) || typeOptions[0]!;

  // Double-booking collision detection against user's catch-ups factoring in duration
  const conflict = checkTimeConflict(date, time, [], myCatchups, durationMinutes);

  if (!open) return null;

  const handleToggleReminder = () => {
    void triggerHaptic("light");
    const nextState = toggleCatchUpReminder({ handle, name, photo: avatar, city, requesterUid: user?.uid });
    setIsRemembered(nextState);
    toast[nextState ? "success" : "info"](
      nextState ? `Saved a reminder to catch up with ${name}` : `Removed reminder for ${name}`,
    );
  };

  const handleLaunch = async () => {
    if (!requireUser("Sign in to propose a catch-up, meeting, or hangout.")) return;
    const liveConflict = checkTimeConflict(date, time, [], myCatchups, durationMinutes);
    if (liveConflict.hasConflict) {
      toast.error(
        `That time overlaps “${liveConflict.conflictingTitle}” at ${liveConflict.conflictingTime}. Pick another slot.`,
      );
      return;
    }
    const effectiveMeetingLink =
      meetingPlatform === "google_meet"
        ? meetingLink.trim() || "https://meet.google.com/new"
        : meetingPlatform === "facetime"
          ? meetingLink.trim() || `facetime:${handle}`
          : meetingPlatform === "zoom"
            ? meetingLink.trim()
            : undefined;

    const place =
      meetingPlatform === "google_meet"
        ? `Google Meet (${effectiveMeetingLink})`
        : meetingPlatform === "facetime"
          ? `FaceTime (${effectiveMeetingLink})`
          : meetingPlatform === "zoom"
            ? `Zoom (${effectiveMeetingLink || "Link to be shared"})`
            : venue.trim() || city;

    setIsSubmitting(true);
    try {
      void triggerHaptic("success");
      const interest = recordCatchUpInterest({
        targetHandle: handle,
        targetOwnerUid: ownerUid,
        requesterUid: user?.uid,
        requesterHandle: mine?.handle,
        requesterName: mine?.name || user?.displayName || "AirPal",
        requesterPhoto: mine?.avatar,
        type: selectedType,
        date,
        time,
        durationMinutes,
        activity: selectedVibe || undefined,
        venue: place,
        meetingLink: effectiveMeetingLink,
        meetingPlatform,
        notes: notes.trim(),
      });
      try {
        await persistCatchUp(interest);
        await scheduleCatchUpRemote({ catchupId: interest.id, action: "open" });
      } catch {
        /* The catch-up row still exists locally. */
      }

      toast.success(`Proposed ${currentOption.label} with ${name}`);
      setSubmittedSummary({
        typeLabel: currentOption.label,
        date,
        time,
        durationMinutes,
        venue: place,
        activity: selectedVibe || undefined,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn’t propose the catch-up");
    } finally {
      setIsSubmitting(false);
    }
  };

  const calcEndsAt = () => {
    try {
      const d = new Date(`${date}T${time || "14:00"}:00`);
      d.setMinutes(d.getMinutes() + (durationMinutes || 45));
      return d.toISOString();
    } catch {
      return undefined;
    }
  };

  const effectiveMeetingLink =
    meetingPlatform === "google_meet"
      ? meetingLink.trim() || "https://meet.google.com/new"
      : meetingPlatform === "facetime"
        ? meetingLink.trim() || undefined
        : meetingPlatform === "zoom"
          ? meetingLink.trim() || undefined
          : undefined;

  const eventPayload = {
    title: `${currentOption.label} with ${name}`,
    description: `${notes ? `${notes}\n\n` : ""}AirPal ${currentOption.label} with @${handle}\nhttps://airpal.me/@${handle}`,
    startsAt: `${date}T${time || "14:00"}:00`,
    endsAt: calcEndsAt(),
    venue:
      meetingPlatform === "in_person"
        ? venue || city
        : meetingPlatform === "facetime"
          ? "FaceTime Call"
          : meetingPlatform === "zoom"
            ? "Zoom Meeting"
            : "Google Meet",
    city: meetingPlatform === "in_person" ? city : undefined,
    meetingLink: effectiveMeetingLink,
    meetingPlatform,
  };

  const handleCopyInviteMessage = async () => {
    void triggerHaptic("selection");
    const summaryVibe = submittedSummary?.activity ? ` (${submittedSummary.activity})` : "";
    const msg = `Hey ${name}! I've proposed a ${submittedSummary?.typeLabel || "catch-up"}${summaryVibe} on AirPal for ${submittedSummary?.date} at ${submittedSummary?.time} (${submittedSummary?.venue}). Let's sync up! https://airpal.me/@${handle}`;
    try {
      await navigator.clipboard.writeText(msg);
      setCopiedInvite(true);
      toast.success("Invite message copied to clipboard!");
      setTimeout(() => setCopiedInvite(false), 2500);
    } catch {
      toast.message(msg);
    }
  };

  const content = (
    <div
      className="visual-viewport-modal z-50 flex items-end sm:items-center justify-center overflow-y-auto bg-black/65 p-0 sm:p-6 backdrop-blur-md motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="catchup-modal-title"
    >
      <div
        className="relative w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden rounded-t-[32px] sm:rounded-[32px] bg-paper shadow-2xl ring-1 ring-line animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] sm:pb-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-line/80 sm:hidden" />

        {/* Top Header */}
        <div className="relative border-b border-line px-6 pb-4 pt-4 sm:pt-6 bg-card/60 backdrop-blur-xl">
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-4 top-4 grid h-11 w-11 min-h-[44px] min-w-[44px] place-items-center rounded-full bg-card text-mute ring-1 ring-line hover:text-ink transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
          <div className="flex items-center gap-3 pr-10">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full ring-2 ring-brand/30">
              {avatar ? (
                <Photo src={avatar} className="h-full w-full object-cover" />
              ) : (
                <span className="grid h-full w-full place-items-center bg-neutral-900 font-display text-lg font-bold text-white">
                  {name[0]}
                </span>
              )}
              <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-paper" />
            </div>
            <div>
              <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-accent">
                <Sparkles size={11} className="text-accent" />
                AirPal Hangout Planner
              </p>
              <h2 id="catchup-modal-title" className="font-display text-lg font-bold text-ink">
                {submittedSummary ? `Catch-up Proposed!` : `Catch up with ${name}`}
              </h2>
              <p className="text-xs text-mute font-medium">@{handle}</p>
            </div>
          </div>
        </div>

        {/* VIEW 1: Success / Confirmation state */}
        {submittedSummary ? (
          <div className="p-6 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center py-2 space-y-2">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-500/15 text-emerald-600 ring-4 ring-emerald-500/20">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="font-display text-xl font-bold text-ink">Invitation Sent</h3>
              <p className="text-xs sm:text-sm text-mute max-w-sm mx-auto">
                We&apos;ve sent a catch-up invitation to <strong>{name}</strong> (@{handle}). You can sync it to your
                calendar now or share a link directly.
              </p>
            </div>

            <div className="rounded-2xl bg-card p-4 ring-1 ring-line/80 space-y-3 text-sm">
              <div className="flex items-center justify-between border-b border-line/40 pb-2.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-mute">Format</span>
                <span className="font-bold text-ink flex items-center gap-1.5">
                  <span>{submittedSummary.typeLabel}</span>
                  {submittedSummary.activity && (
                    <span className="text-xs rounded-full bg-brand/10 text-accent px-2 py-0.5">
                      {submittedSummary.activity}
                    </span>
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-line/40 pb-2.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-mute">When</span>
                <span className="font-semibold text-ink text-right">
                  {submittedSummary.date} ·{" "}
                  {formatCatchUpTimeRange(submittedSummary.time, submittedSummary.durationMinutes)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-mute">Location</span>
                <span className="font-semibold text-ink text-right truncate max-w-[200px]">
                  {submittedSummary.venue}
                </span>
              </div>
            </div>

            <div className="space-y-2.5 pt-2">
              <AddToCalendarMenu
                event={eventPayload}
                size="md"
                variant="primary"
                label="Sync to Phone Calendar (.ics)"
                buttonClassName="w-full justify-center min-h-[48px] rounded-full font-bold shadow-sm"
              />

              <button
                type="button"
                onClick={() => void handleCopyInviteMessage()}
                className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-full bg-card px-4 text-xs font-bold text-ink ring-1 ring-line hover:bg-paper transition cursor-pointer active:scale-95 touch-manipulation"
              >
                {copiedInvite ? (
                  <>
                    <Check size={14} className="text-emerald-600" />
                    <span>Copied Message ✓</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} className="text-accent" />
                    <span>Copy Mate Invite Message (WhatsApp / iMessage)</span>
                  </>
                )}
              </button>

              <Button
                variant="ghost"
                onClick={handleClose}
                className="w-full min-h-[44px] rounded-full text-xs font-semibold text-mute hover:text-ink"
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          /* VIEW 2: Form configuration */
          <>
            <div className="max-h-[65vh] space-y-5 overflow-y-auto p-6">
              {/* Double-booking Collision Warning */}
              {conflict.hasConflict && (
                <div className="rounded-2xl bg-amber-500/10 p-3.5 ring-1 ring-amber-500/30 text-xs animate-in fade-in">
                  <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-400">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                    <span>Double-Booking Conflict Detected</span>
                  </div>
                  <p className="mt-1 text-amber-900/90 dark:text-amber-200/90 leading-relaxed">
                    You already have{" "}
                    <strong className="font-semibold">&ldquo;{conflict.conflictingTitle}&rdquo;</strong> scheduled
                    around <strong className="font-semibold">{conflict.conflictingTime}</strong>. Choose a free slot to
                    avoid overlapping your schedule.
                  </p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-medium text-amber-800/80">Available slots:</span>
                    {["10:00", "11:30", "15:00", "16:30", "18:00"].map((altTime) => (
                      <button
                        key={altTime}
                        type="button"
                        onClick={() => {
                          void triggerHaptic("light");
                          setTime(altTime);
                        }}
                        className={cn(
                          "inline-flex min-h-[44px] items-center rounded-lg px-3 text-[10px] font-bold transition cursor-pointer",
                          time === altTime
                            ? "bg-amber-600 text-white"
                            : "bg-amber-500/20 text-amber-900 dark:text-amber-200 hover:bg-amber-500/30",
                        )}
                      >
                        {altTime}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Format selection */}
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-mute">Meeting Format</p>
                <div className="grid grid-cols-3 gap-2">
                  {typeOptions.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = selectedType === opt.type;
                    return (
                      <button
                        key={opt.type}
                        type="button"
                        onClick={() => {
                          void triggerHaptic("light");
                          setSelectedType(opt.type);
                          if (opt.type === "nightout" && durationMinutes < 60) setDurationMinutes(120);
                        }}
                        className={cn(
                          "flex flex-col items-center rounded-2xl p-3 text-center ring-1 transition cursor-pointer active:scale-95",
                          isSelected ? "bg-card ring-brand shadow-xs" : "bg-card/60 ring-line hover:bg-card",
                        )}
                      >
                        <span className={cn("mb-1.5 rounded-xl border p-2", opt.color)}>
                          <Icon size={16} />
                        </span>
                        <span className="text-xs font-bold text-ink">{opt.label}</span>
                        <span className="mt-0.5 text-[10px] text-mute">{opt.sublabel}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Hangout Vibe / Activity selection (visible when nightout/hangout is active) */}
              {selectedType === "nightout" && (
                <div className="rounded-2xl bg-card/60 p-3.5 ring-1 ring-line/80 space-y-2 animate-in fade-in">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-mute flex items-center gap-1.5">
                    <span>Hangout Vibe &amp; Activity</span>
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {HANGOUT_VIBES.map((vibe) => (
                      <button
                        key={vibe.id}
                        type="button"
                        onClick={() => {
                          void triggerHaptic("selection");
                          setSelectedVibe(selectedVibe === vibe.label ? "" : vibe.label);
                        }}
                        className={cn(
                          "inline-flex min-h-[40px] items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold ring-1 transition cursor-pointer active:scale-95 touch-manipulation",
                          selectedVibe === vibe.label
                            ? "bg-purple-500/15 text-purple-700 ring-purple-500/30 font-bold"
                            : "bg-paper text-mute ring-line hover:text-ink hover:bg-card",
                        )}
                      >
                        <span>{vibe.icon}</span>
                        <span className="truncate">{vibe.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Duration selector */}
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-mute">Duration</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {DURATION_OPTIONS.map((d) => (
                    <button
                      key={d.mins}
                      type="button"
                      onClick={() => {
                        void triggerHaptic("selection");
                        setDurationMinutes(d.mins);
                      }}
                      className={cn(
                        "flex flex-col items-center justify-center min-h-[48px] rounded-xl px-1 py-1.5 text-center ring-1 transition cursor-pointer active:scale-95 touch-manipulation",
                        durationMinutes === d.mins
                          ? "bg-brand text-white ring-brand shadow-xs font-bold"
                          : "bg-card text-ink ring-line hover:bg-paper",
                      )}
                    >
                      <span className="text-xs font-bold">{d.label}</span>
                      <span className={cn("text-[9px]", durationMinutes === d.mins ? "text-white/80" : "text-mute")}>
                        {d.sub}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Date & Time selection */}
              <div className="space-y-2">
                <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-mute">
                      Date
                    </label>
                    <div className="relative">
                      <Calendar size={14} className="absolute left-3.5 top-3.5 text-mute" />
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="min-h-[46px] h-11 w-full rounded-2xl border border-line bg-card pl-9 pr-3 text-[16px] sm:text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:border-brand touch-manipulation"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-mute">
                      Time ({durationMinutes}m duration)
                    </label>
                    <div className="relative">
                      <Clock size={14} className="absolute left-3.5 top-3.5 text-mute" />
                      <input
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="min-h-[46px] h-11 w-full rounded-2xl border border-line bg-card pl-9 pr-3 text-[16px] sm:text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:border-brand touch-manipulation"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    ["Today", 0],
                    ["Tomorrow", 1],
                    ["Weekend", 3],
                  ].map(([label, days]) => (
                    <button
                      key={String(label)}
                      type="button"
                      onClick={() => {
                        void triggerHaptic("light");
                        setDate(localDate(Number(days)));
                      }}
                      className="min-h-[40px] flex-1 sm:flex-initial whitespace-nowrap rounded-xl bg-card px-3 py-1.5 text-xs font-semibold text-mute ring-1 ring-line hover:text-ink cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand touch-manipulation"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Where / Meeting platform */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-mute">
                    Where / Location
                  </label>
                  {meetingPlatform !== "in_person" && (
                    <span className="text-[10px] font-bold text-accent uppercase tracking-wider">Virtual Meeting</span>
                  )}
                </div>

                {/* 4-way Segmented Control */}
                <div className="grid grid-cols-4 gap-1 rounded-2xl bg-card p-1 ring-1 ring-line">
                  <button
                    type="button"
                    onClick={() => {
                      void triggerHaptic("light");
                      setMeetingPlatform("in_person");
                    }}
                    className={cn(
                      "min-h-[44px] flex items-center justify-center gap-1 whitespace-nowrap rounded-xl px-1 py-2 text-[10px] sm:text-xs font-semibold transition cursor-pointer active:scale-95 touch-manipulation",
                      meetingPlatform === "in_person"
                        ? "bg-paper text-ink shadow-xs ring-1 ring-line/80 font-bold"
                        : "text-mute hover:text-ink",
                    )}
                  >
                    <MapPin size={13} className="shrink-0" />
                    <span>In Person</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void triggerHaptic("light");
                      setMeetingPlatform("google_meet");
                      if (!meetingLink && defaultMeetingUrl) setMeetingLink(defaultMeetingUrl);
                    }}
                    className={cn(
                      "min-h-[44px] flex items-center justify-center gap-1 whitespace-nowrap rounded-xl px-1 py-2 text-[10px] sm:text-xs font-semibold transition cursor-pointer active:scale-95 touch-manipulation",
                      meetingPlatform === "google_meet"
                        ? "bg-brand/10 text-accent ring-1 ring-brand/30 shadow-xs font-bold"
                        : "text-mute hover:text-ink",
                    )}
                  >
                    <Video size={13} className="shrink-0" />
                    <span>Meet</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void triggerHaptic("light");
                      setMeetingPlatform("facetime");
                      if (!meetingLink && defaultMeetingUrl) setMeetingLink(defaultMeetingUrl);
                    }}
                    className={cn(
                      "min-h-[44px] flex items-center justify-center gap-1 whitespace-nowrap rounded-xl px-1 py-2 text-[10px] sm:text-xs font-semibold transition cursor-pointer active:scale-95 touch-manipulation",
                      meetingPlatform === "facetime"
                        ? "bg-emerald-500/15 text-emerald-800 ring-1 ring-emerald-500/30 shadow-xs font-bold"
                        : "text-mute hover:text-ink",
                    )}
                  >
                    <PhoneCall size={13} className="shrink-0" />
                    <span>FaceTime</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void triggerHaptic("light");
                      setMeetingPlatform("zoom");
                      if (!meetingLink && defaultMeetingUrl) setMeetingLink(defaultMeetingUrl);
                    }}
                    className={cn(
                      "min-h-[44px] flex items-center justify-center gap-1 whitespace-nowrap rounded-xl px-1 py-2 text-[10px] sm:text-xs font-semibold transition cursor-pointer active:scale-95 touch-manipulation",
                      meetingPlatform === "zoom"
                        ? "bg-blue-500/15 text-blue-800 ring-1 ring-blue-500/30 shadow-xs font-bold"
                        : "text-mute hover:text-ink",
                    )}
                  >
                    <Video size={13} className="shrink-0" />
                    <span>Zoom</span>
                  </button>
                </div>

                {meetingPlatform === "in_person" ? (
                  <div className="space-y-2">
                    <div className="relative">
                      <MapPin size={14} className="absolute left-3.5 top-3.5 text-mute" />
                      <input
                        type="text"
                        value={venue}
                        onChange={(e) => setVenue(e.target.value)}
                        placeholder={city ? `Café or venue in ${city}` : "A café nearby"}
                        className="min-h-[46px] h-11 w-full rounded-2xl border border-line bg-card pl-9 pr-3 text-[16px] sm:text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:border-brand touch-manipulation"
                      />
                    </div>
                    {/* Venue shortcut chips */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className="text-[10px] font-semibold text-mute">Quick spots:</span>
                      {VENUE_SHORTCUTS.map((spot) => (
                        <button
                          key={spot}
                          type="button"
                          onClick={() => {
                            void triggerHaptic("light");
                            setVenue(spot);
                          }}
                          className={cn(
                            "inline-flex min-h-[36px] items-center rounded-lg px-2.5 text-[11px] font-medium ring-1 transition cursor-pointer touch-manipulation",
                            venue === spot
                              ? "bg-brand/10 text-accent ring-brand/30 font-bold"
                              : "bg-paper text-mute ring-line hover:text-ink hover:bg-card",
                          )}
                        >
                          {spot}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : meetingPlatform === "google_meet" ? (
                  <div className="space-y-1.5">
                    <div className="relative">
                      <Video size={14} className="absolute left-3.5 top-3.5 text-accent" />
                      <input
                        type="url"
                        value={meetingLink}
                        onChange={(e) => setMeetingLink(e.target.value)}
                        placeholder="https://meet.google.com/xxx-yyyy-zzz"
                        className="min-h-[46px] h-11 w-full rounded-2xl border border-line bg-card pl-9 pr-24 text-[16px] sm:text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:border-brand touch-manipulation"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          void triggerHaptic("light");
                          setMeetingLink("https://meet.google.com/new");
                        }}
                        className="absolute right-2 top-2 rounded-xl bg-brand/10 px-2.5 py-1.5 text-[11px] font-bold text-accent hover:bg-brand/20 transition cursor-pointer touch-manipulation"
                        title="Use instant Google Meet link"
                      >
                        meet.new
                      </button>
                    </div>
                    <p className="text-[11px] text-mute flex items-center justify-between">
                      <span>Uses Google Meet web video call.</span>
                      <a
                        href="https://meet.google.com/new"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:underline inline-flex items-center gap-0.5"
                      >
                        <span>Open Meet</span>
                        <ExternalLink size={10} />
                      </a>
                    </p>
                  </div>
                ) : meetingPlatform === "facetime" ? (
                  <div className="space-y-1.5">
                    <div className="relative">
                      <PhoneCall size={14} className="absolute left-3.5 top-3.5 text-emerald-600" />
                      <input
                        type="text"
                        value={meetingLink}
                        onChange={(e) => setMeetingLink(e.target.value)}
                        placeholder="https://facetime.apple.com/... or Apple ID"
                        className="min-h-[46px] h-11 w-full rounded-2xl border border-line bg-card pl-9 pr-3 text-[16px] sm:text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:border-brand touch-manipulation"
                      />
                    </div>
                    <p className="text-[11px] text-mute leading-relaxed">
                      Paste a FaceTime Web link (works on iPhone, Mac, Windows &amp; Android) or enter an Apple ID
                      email/phone.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="relative">
                      <Video size={14} className="absolute left-3.5 top-3.5 text-blue-600" />
                      <input
                        type="url"
                        value={meetingLink}
                        onChange={(e) => setMeetingLink(e.target.value)}
                        placeholder="https://zoom.us/j/..."
                        className="min-h-[46px] h-11 w-full rounded-2xl border border-line bg-card pl-9 pr-3 text-[16px] sm:text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:border-brand touch-manipulation"
                      />
                    </div>
                    <p className="text-[11px] text-mute leading-relaxed">
                      Paste your personal Zoom meeting or room link.
                    </p>
                  </div>
                )}
              </div>

              {/* Note / Agenda */}
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-mute">
                  Note / Agenda
                </label>
                <div className="relative">
                  <MessageSquare size={14} className="absolute left-3.5 top-3 text-mute" />
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={
                      selectedVibe
                        ? `Let's do a ${selectedVibe}! What do you think?`
                        : "Optional notes, topic, or meetup idea"
                    }
                    className="w-full resize-none rounded-2xl border border-line bg-card py-2.5 pl-9 pr-3 text-[16px] sm:text-xs outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:border-brand touch-manipulation"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="space-y-3 border-t border-line bg-card/60 p-5">
              <Button
                className="min-h-[48px] h-12 w-full gap-2 rounded-full font-bold shadow-md cursor-pointer touch-manipulation"
                onClick={handleLaunch}
                disabled={isSubmitting || conflict.hasConflict}
                title={conflict.hasConflict ? "Pick a free time slot before proposing" : undefined}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Proposing…
                  </>
                ) : (
                  <>
                    <Zap size={16} />
                    {conflict.hasConflict
                      ? "Pick a free time first"
                      : `Propose ${currentOption.label} (${durationMinutes}m)`}
                  </>
                )}
              </Button>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleToggleReminder}
                  className={cn(
                    "inline-flex min-h-[44px] whitespace-nowrap items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold ring-1 transition cursor-pointer active:scale-95 touch-manipulation",
                    isRemembered
                      ? "bg-amber-500/15 text-amber-800 dark:text-amber-300 ring-amber-500/40 dark:ring-amber-500/30 font-bold"
                      : "bg-card text-ink ring-line hover:bg-paper",
                  )}
                >
                  <Bell
                    size={13}
                    className={cn("shrink-0", isRemembered ? "fill-amber-500 text-amber-600 dark:text-amber-400" : "")}
                  />
                  {isRemembered ? "Reminder on ✓" : "Remind me"}
                </button>
                <AddToCalendarMenu
                  event={eventPayload}
                  size="sm"
                  variant="secondary"
                  label="Sync to Phone Calendar"
                  buttonClassName="rounded-full text-xs font-semibold min-h-[44px]"
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(content, document.body) : null;
}
