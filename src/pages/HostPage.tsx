import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocation, useSearch } from "wouter";
import { toast } from "sonner";
import {
  ArrowUpRight,
  BedDouble,
  Building2,
  CalendarDays,
  ExternalLink,
  HeartHandshake,
  LayoutDashboard,
  Printer,
  Store,
  UtensilsCrossed,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PageLoading } from "@/components/ui/PageLoading";
import { ValidField, fieldInput } from "@/components/forms/ValidField";
import { AuthGate } from "@/components/auth/AuthGate";
import { VerifyEmailBanner } from "@/components/auth/VerifyEmailBanner";
import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";
import { partnerAccountPath } from "@/lib/partner-account";
import { NAMES } from "@shared/names";
import { fetchProperty, subscribeProperty, subscribePropertyMenu, unknownProperty } from "@/lib/properties";
import { makeQrDataUrl, stayQrPayload } from "@/lib/qr";
import { buildMarkerUrl } from "@shared/airpal-urls";
import { propertyKindLabel, type HostPropertyKind } from "@shared/host-property";
import type { DiningOrder, MenuItem, PropertyInfo, StaffTicket } from "@shared/airpal-data";
import { authErrorMessage } from "@shared/auth-email";
import { DEMO_BUSINESS, DEMO_PROPERTY_ID, isDemoModeSearch } from "@shared/demo-business";
import { HostPlaceForm } from "@/components/host/HostPlaceForm";
import { HostRoomsPanel } from "@/components/host/HostRoomsPanel";
import { StayBlocksPanel } from "@/components/host/StayBlocksPanel";
import { HostFacilitiesPanel } from "@/components/host/HostFacilitiesPanel";
import { HostDiningPanel } from "@/components/host/HostDiningPanel";
import { HostPrintPanel } from "@/components/host/HostPrintPanel";
import { HostTodaySummary } from "@/components/host/HostTodaySummary";
import { HostTicketBoard } from "@/components/host/HostTicketBoard";
import { HostOrderBoard } from "@/components/host/HostOrderBoard";
import { BelongingReportPanel } from "@/components/host/BelongingReportPanel";
import { openTicketCount, subscribePropertyTickets } from "@/lib/tickets-store";
import { activeOrderCount, subscribePropertyDiningOrders } from "@/lib/dining-store";
import { hostWorkspacePropertyId, roomTokenEntries } from "@/lib/host-workspace";
import { getPropertyWifiRemote, liveBackendEnabled } from "@/lib/functions";
import { triggerHaptic, triggerHapticSelection } from "@/lib/native";
import { cn } from "@/lib/cn";

export type HostTab = "today" | "belonging" | "rooms" | "dining" | "facilities" | "place" | "print";

interface NavSectionItem {
  id: HostTab;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: string | number | null;
  badgeVariant?: "brand" | "danger" | "success" | "neutral";
}

export function HostPage() {
  const { user, isHost, isAdmin, authReady, createHostProperty, sendVerificationEmail } = useAuth();
  const { business } = useBio();
  const [, nav] = useLocation();
  const [tab, setTab] = useState<HostTab>("today");
  const workspaceId = hostWorkspacePropertyId(user?.propertyIds, isAdmin);
  const [property, setProperty] = useState<PropertyInfo>(() =>
    workspaceId ? unknownProperty(workspaceId) : unknownProperty("unknown"),
  );
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [tickets, setTickets] = useState<StaffTicket[]>([]);
  const [orders, setOrders] = useState<DiningOrder[]>([]);
  const [wifiLive, setWifiLive] = useState(false);
  const [qrReady, setQrReady] = useState(false);

  const [newPropName, setNewPropName] = useState("");
  const [newPropKind, setNewPropKind] = useState<HostPropertyKind>("hotel");
  const [newPropCity, setNewPropCity] = useState("Sydney");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!workspaceId) {
      setProperty(unknownProperty("unknown"));
      return;
    }
    const unsub = subscribeProperty(workspaceId, setProperty);
    void fetchProperty(workspaceId).then(setProperty);
    return unsub;
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId) {
      setMenu([]);
      return;
    }
    return subscribePropertyMenu(workspaceId, setMenu);
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId) return;
    return subscribePropertyTickets(workspaceId, setTickets);
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId) {
      setOrders([]);
      return;
    }
    return subscribePropertyDiningOrders(workspaceId, setOrders);
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId || workspaceId === "unknown" || !liveBackendEnabled()) {
      setWifiLive(Boolean(property.wifi?.network && property.wifiUpdatedAt));
      return;
    }
    void getPropertyWifiRemote({ propertyId: workspaceId })
      .then((res) => setWifiLive(Boolean(res.network && res.password)))
      .catch(() => setWifiLive(Boolean(property.wifi?.network && property.wifiUpdatedAt)));
  }, [workspaceId, property.wifi, property.wifiUpdatedAt]);

  useEffect(() => {
    if (!property.id || property.id === "unknown") {
      setQrReady(false);
      return;
    }
    let alive = true;
    const rooms = roomTokenEntries(property.roomTokens);
    void (async () => {
      const lobbyUrl = property.lobbyMarkerId
        ? buildMarkerUrl(property.lobbyMarkerId, window.location.origin)
        : `${window.location.origin}/g/${property.id}`;
      await makeQrDataUrl(lobbyUrl);
      if (rooms[0]) await makeQrDataUrl(stayQrPayload(property.id, { room: rooms[0][1], roomToken: rooms[0][0] }));
      if (alive) setQrReady(true);
    })();
    return () => {
      alive = false;
    };
  }, [property.id, property.lobbyMarkerId, property.roomTokens]);

  const hasOwn = Boolean(user?.propertyIds?.length);
  const demoMode = isAdmin && isDemoModeSearch(useSearch());
  const showCreate = (Boolean(user) && !hasOwn && !isHost && !isAdmin) || demoMode;

  useEffect(() => {
    if (!demoMode) return;
    setNewPropName((v) => v || DEMO_BUSINESS.name);
    setNewPropCity((v) => v || DEMO_BUSINESS.city);
  }, [demoMode]);

  async function onCreateProperty(e: FormEvent) {
    e.preventDefault();
    if (!newPropName.trim()) {
      toast.error("Enter a property name");
      return;
    }
    setCreating(true);
    try {
      await createHostProperty({
        propertyName: newPropName.trim(),
        kind: newPropKind,
        city: newPropCity.trim() || "Sydney",
        demo: demoMode || undefined,
        propertyId: demoMode ? DEMO_PROPERTY_ID : undefined,
      });
      toast.success("Place listed");
    } catch (err) {
      toast.error(authErrorMessage(err, "Failed to create property"));
    } finally {
      setCreating(false);
    }
  }

  // Key metrics for the top KPI row & sidebar badges
  const openTickets = useMemo(() => openTicketCount(tickets), [tickets]);
  const activeOrders = useMemo(() => activeOrderCount(orders), [orders]);
  const roomCount = useMemo(() => roomTokenEntries(property.roomTokens).length, [property.roomTokens]);

  const occupancy = useMemo(() => {
    const statuses = Object.values(property.roomStatuses || {});
    if (!statuses.length) return null;
    const occupied = statuses.filter((s) => s === "occupied").length;
    const vacant = statuses.filter((s) => s === "vacant").length;
    const total = statuses.length;
    const rate = total > 0 ? Math.round((occupied / total) * 100) : 0;
    return { occupied, vacant, total, rate };
  }, [property.roomStatuses]);

  // Sidebar navigation structure grouped into clear domains
  const navSections = useMemo<{ title: string; items: NavSectionItem[] }[]>(() => {
    return [
      {
        title: "Operations",
        items: [
          {
            id: "today",
            label: "Today's Board",
            icon: LayoutDashboard,
            badge: openTickets > 0 ? `${openTickets} open` : null,
            badgeVariant: openTickets > 0 ? "danger" : "neutral",
          },
          {
            id: "belonging",
            label: "Belonging Report",
            icon: HeartHandshake,
            badge: "Audited",
            badgeVariant: "brand",
          },
        ],
      },
      {
        title: "Guest Experience",
        items: [
          {
            id: "rooms",
            label: "Rooms & Cohorts",
            icon: BedDouble,
            badge: roomCount > 0 ? `${roomCount}` : null,
            badgeVariant: "neutral",
          },
          {
            id: "dining",
            label: "Dining & Menu",
            icon: UtensilsCrossed,
            badge: activeOrders > 0 ? `${activeOrders} active` : menu.length > 0 ? `${menu.length}` : null,
            badgeVariant: activeOrders > 0 ? "danger" : "neutral",
          },
          {
            id: "facilities",
            label: "Facilities & Wi-Fi",
            icon: Wifi,
            badge: wifiLive ? "Online" : "Setup",
            badgeVariant: wifiLive ? "success" : "neutral",
          },
        ],
      },
      {
        title: "Setup & Signage",
        items: [
          {
            id: "place",
            label: "Place Profile",
            icon: Building2,
          },
          {
            id: "print",
            label: "Print & QR Signs",
            icon: Printer,
            badge: qrReady ? "Ready" : null,
            badgeVariant: "success",
          },
        ],
      },
    ];
  }, [openTickets, activeOrders, roomCount, menu.length, wifiLive, qrReady]);

  if (!authReady) {
    return <PageLoading />;
  }

  if (!user) {
    return (
      <AuthGate
        next="/host"
        kicker="Host"
        title="List your place"
        lede="Sign in or create an account first. Then list a hotel, venue, hostel, campus, local place, or event."
      />
    );
  }

  if (showCreate) {
    return (
      <div className="mx-auto max-w-md px-4 py-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-accent">Host Workspace</p>
        <h1 className="font-display mt-1 text-3xl font-semibold">List your place</h1>
        <p className="mt-2 text-sm text-mute">
          Create a hotel, venue, hostel, or campus workspace. Or list a local shop, or an event.
        </p>
        {user.emailVerified === false && <VerifyEmailBanner email={user.email} onSend={sendVerificationEmail} />}
        <form onSubmit={onCreateProperty} className="mt-6 space-y-3">
          <ValidField label="Place name" ok={newPropName.trim().length >= 2}>
            <input
              value={newPropName}
              onChange={(e) => setNewPropName(e.target.value)}
              placeholder="e.g. Bondi Beach House"
              className={fieldInput}
            />
          </ValidField>
          <label className="block">
            <span className="text-[12px] text-mute">Kind</span>
            <select
              value={newPropKind}
              onChange={(e) => setNewPropKind(e.target.value as HostPropertyKind)}
              className={`${fieldInput} mt-1`}
            >
              <option value="hotel">Hotel</option>
              <option value="venue">Venue</option>
              <option value="hostel">Hostel</option>
              <option value="campus">Campus</option>
            </select>
          </label>
          <ValidField label="City" ok={newPropCity.trim().length >= 2}>
            <input value={newPropCity} onChange={(e) => setNewPropCity(e.target.value)} className={fieldInput} />
          </ValidField>
          <Button type="submit" className="w-full min-h-[44px]" disabled={creating} loading={creating}>
            {creating ? "Creating…" : "Create host workspace"}
          </Button>
        </form>
        <div className="mt-6 space-y-2">
          <Button
            variant="ghost"
            className="w-full min-h-[44px]"
            onClick={() => nav(partnerAccountPath({ signedIn: true, hasPlace: Boolean(business) }))}
          >
            {business ? NAMES.yourPlace : NAMES.partnerAccount}
          </Button>
          <Button variant="ghost" className="w-full min-h-[44px]" onClick={() => nav("/event")}>
            Create an event
          </Button>
        </div>
      </div>
    );
  }

  const liveName = property.name || (workspaceId ? "Loading place…" : "Your place");

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-6 py-4 md:py-8 pb-[calc(env(safe-area-inset-bottom,0px)+6.5rem)]">
      {user.emailVerified === false && <VerifyEmailBanner email={user.email} onSend={sendVerificationEmail} />}

      {/* Top Mobile Operator Strip: Quick Pill Switcher (< lg) */}
      <div className="mb-4 lg:hidden">
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <Building2 size={16} className="text-accent shrink-0" />
            <h1 className="font-display text-base font-bold text-ink truncate">{liveName}</h1>
          </div>
          <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/20">
            Live Host
          </span>
        </div>

        <nav
          aria-label="Host sections"
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar snap-x overscroll-x-contain py-1 -mx-3 px-3"
        >
          {navSections
            .flatMap((s) => s.items)
            .map((item) => {
              const isActive = tab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    void triggerHapticSelection();
                    setTab(item.id);
                  }}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-[44px] shrink-0 snap-start items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition active:scale-95 cursor-pointer touch-manipulation",
                    isActive
                      ? "bg-brand text-white shadow-[0_4px_12px_-4px_rgba(24,5,219,0.35)]"
                      : "border border-line bg-card text-mute hover:text-ink hover:bg-paper",
                  )}
                >
                  <Icon size={14} className={isActive ? "text-white" : "text-accent"} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span
                      className={cn(
                        "ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                        isActive
                          ? "bg-white/20 text-white"
                          : item.badgeVariant === "danger"
                            ? "bg-rose-500/15 text-rose-700 dark:text-rose-400"
                            : "bg-paper text-mute",
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
        </nav>
      </div>

      {/* Main Two-Column Layout (Side Menu Bar on Desktop + Content Panes) */}
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
        {/* ======================================================== */}
        {/* DESKTOP SIDE MENU BAR (Operator Navigation Console) */}
        {/* ======================================================== */}
        <aside
          aria-label="Host operator console navigation"
          className="hidden lg:flex w-64 xl:w-72 shrink-0 flex-col gap-6 sticky top-24"
        >
          {/* Property Identity Card */}
          <div className="rounded-2xl bg-card p-4 ring-1 ring-line shadow-clay">
            <div className="flex items-center justify-between">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-accent">
                <Building2 size={20} />
              </span>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/20">
                Live Console
              </span>
            </div>
            <h2 className="mt-3 font-display text-lg font-bold text-ink leading-tight truncate" title={liveName}>
              {liveName}
            </h2>
            <p className="text-xs text-mute mt-0.5">
              {property.city || "Sydney"} · {propertyKindLabel(property.kind)}
            </p>

            <div className="mt-3 pt-3 border-t border-line/60 flex items-center justify-between text-[11px] text-mute">
              <span>Arrival Code:</span>
              <code className="font-mono font-bold text-accent">{property.id.slice(0, 8)}</code>
            </div>
          </div>

          {/* Grouped Sidebar Navigation Menu */}
          <nav className="rounded-2xl bg-card p-2.5 ring-1 ring-line shadow-clay space-y-4">
            {navSections.map((section) => (
              <div key={section.title}>
                <p className="px-3 pb-1 pt-1.5 text-[10px] font-black uppercase tracking-wider text-mute">
                  {section.title}
                </p>
                <div className="mt-1 space-y-0.5">
                  {section.items.map((item) => {
                    const isActive = tab === item.id;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          void triggerHapticSelection();
                          setTab(item.id);
                        }}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "flex w-full min-h-[44px] items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold transition cursor-pointer active:scale-[0.98]",
                          isActive
                            ? "bg-brand text-white shadow-[0_4px_12px_-4px_rgba(24,5,219,0.35)]"
                            : "text-ink hover:bg-paper",
                        )}
                      >
                        <span className="flex items-center gap-2.5">
                          <Icon size={16} className={isActive ? "text-white" : "text-accent"} />
                          <span>{item.label}</span>
                        </span>

                        {item.badge && (
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums",
                              isActive
                                ? "bg-white/20 text-white"
                                : item.badgeVariant === "danger"
                                  ? "bg-rose-500/15 text-rose-700 dark:text-rose-400 ring-1 ring-rose-500/30"
                                  : item.badgeVariant === "brand"
                                    ? "bg-brand/10 text-accent ring-1 ring-brand/20"
                                    : item.badgeVariant === "success"
                                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/20"
                                      : "bg-paper text-mute ring-1 ring-line",
                            )}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Quick Hub Portals in Sidebar Footer */}
            <div className="border-t border-line/60 pt-2 space-y-0.5">
              <p className="px-3 pb-1 pt-1 text-[10px] font-black uppercase tracking-wider text-mute">Portals</p>
              <button
                type="button"
                onClick={() => {
                  void triggerHaptic("light");
                  nav("/join");
                }}
                className="flex w-full min-h-[40px] items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-medium text-mute hover:text-ink hover:bg-paper transition cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <ExternalLink size={14} className="text-accent" />
                  <span>Arrival Portal</span>
                </span>
                <ArrowUpRight size={13} className="text-mute" />
              </button>

              <button
                type="button"
                onClick={() => {
                  void triggerHaptic("light");
                  nav("/event");
                }}
                className="flex w-full min-h-[40px] items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-medium text-mute hover:text-ink hover:bg-paper transition cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <CalendarDays size={14} className="text-accent" />
                  <span>Event Host Console</span>
                </span>
                <ArrowUpRight size={13} className="text-mute" />
              </button>

              <button
                type="button"
                onClick={() => {
                  void triggerHaptic("light");
                  nav("/business");
                }}
                className="flex w-full min-h-[40px] items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-medium text-mute hover:text-ink hover:bg-paper transition cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <Store size={14} className="text-accent" />
                  <span>Business Hub</span>
                </span>
                <ArrowUpRight size={13} className="text-mute" />
              </button>
            </div>
          </nav>
        </aside>

        {/* ======================================================== */}
        {/* MAIN OPERATOR CONTENT AREA */}
        {/* ======================================================== */}
        <main className="flex-1 min-w-0 w-full space-y-6">
          {/* Executive Header Banner */}
          <div className="rounded-3xl bg-card p-5 sm:p-6 ring-1 ring-line shadow-clay">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-accent">
                    {property.city || "Sydney"} · {propertyKindLabel(property.kind)}
                  </span>
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <h1 className="font-display mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-ink">
                  {liveName}
                </h1>
                {property.tagline && <p className="mt-1 text-xs sm:text-sm text-mute">{property.tagline}</p>}
              </div>

              {/* Header Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="ghost"
                  onClick={() => {
                    void triggerHaptic("light");
                    nav("/join");
                  }}
                  className="min-h-[44px] gap-1.5 px-3.5 text-xs font-semibold"
                >
                  <span>Guest Portal</span>
                  <ExternalLink size={14} />
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    void triggerHaptic("light");
                    nav(partnerAccountPath({ signedIn: true, hasPlace: Boolean(business) }));
                  }}
                  className="min-h-[44px] px-3.5 text-xs font-semibold"
                >
                  {business ? NAMES.yourPlace : NAMES.partnerAccount}
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    void triggerHaptic("medium");
                    setTab("print");
                  }}
                  className="min-h-[44px] gap-1.5 px-4 text-xs font-semibold shadow-xs"
                >
                  <Printer size={14} />
                  <span>Print Signs</span>
                </Button>
              </div>
            </div>

            {/* Quick KPI Stat Chips Row */}
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4 border-t border-line/60">
              <div className="rounded-2xl bg-paper/80 p-3 ring-1 ring-line/60">
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-mute">Occupancy</p>
                <p className="font-display text-xl sm:text-2xl font-black text-ink mt-0.5 tabular-nums">
                  {occupancy ? `${occupancy.rate}%` : "—"}
                </p>
                <p className="text-[10px] text-mute mt-0.5">
                  {occupancy ? `${occupancy.occupied}/${occupancy.total} rooms` : "No rooms tracked"}
                </p>
              </div>

              <div className="rounded-2xl bg-paper/80 p-3 ring-1 ring-line/60">
                <div className="flex items-center justify-between">
                  <p className="text-[10.5px] font-bold uppercase tracking-wider text-mute">Guest Tickets</p>
                  {openTickets > 0 && <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />}
                </div>
                <p
                  className={cn(
                    "font-display text-xl sm:text-2xl font-black mt-0.5 tabular-nums",
                    openTickets > 0 ? "text-rose-600 dark:text-rose-400" : "text-ink",
                  )}
                >
                  {openTickets}
                </p>
                <p className="text-[10px] text-mute mt-0.5">
                  {openTickets === 0 ? "All resolved" : "Requires attention"}
                </p>
              </div>

              <div className="rounded-2xl bg-paper/80 p-3 ring-1 ring-line/60">
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-mute">Dining Orders</p>
                <p className="font-display text-xl sm:text-2xl font-black text-ink mt-0.5 tabular-nums">
                  {activeOrders}
                </p>
                <p className="text-[10px] text-mute mt-0.5">
                  {activeOrders > 0 ? "Active kitchen orders" : "Ready for orders"}
                </p>
              </div>

              <div className="rounded-2xl bg-paper/80 p-3 ring-1 ring-line/60">
                <div className="flex items-center justify-between">
                  <p className="text-[10.5px] font-bold uppercase tracking-wider text-mute">Digital Wi-Fi</p>
                  {wifiLive ? (
                    <Wifi size={13} className="text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <WifiOff size={13} className="text-amber-500" />
                  )}
                </div>
                <p
                  className={cn(
                    "font-display text-base sm:text-lg font-black mt-0.5",
                    wifiLive ? "text-emerald-700 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400",
                  )}
                >
                  {wifiLive ? "Online" : "Setup Needed"}
                </p>
                <p className="text-[10px] text-mute mt-0.5">
                  {wifiLive ? property.wifi?.network || "Connected" : "No network credentials"}
                </p>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* TAB PANES */}
          {/* ======================================================== */}
          {tab === "today" && (
            <div className="space-y-6">
              <HostTodaySummary
                property={property}
                wifiLive={wifiLive}
                qrReady={qrReady}
                onManageRooms={() => {
                  void triggerHapticSelection();
                  setTab("rooms");
                }}
              />
              <HostTicketBoard propertyId={property.id} tickets={tickets} />
              <HostOrderBoard propertyId={property.id} orders={orders} />
            </div>
          )}

          {tab === "belonging" && (
            <div className="rounded-3xl bg-card p-5 sm:p-6 ring-1 ring-line shadow-clay">
              <BelongingReportPanel />
            </div>
          )}

          {tab === "rooms" && (
            <div className="space-y-6">
              <HostRoomsPanel property={property} onSaved={setProperty} />
              <StayBlocksPanel propertyId={property.id} />
            </div>
          )}

          {tab === "dining" && (
            <div className="space-y-6">
              <HostDiningPanel propertyId={property.id} menu={menu} />
            </div>
          )}

          {tab === "facilities" && (
            <div className="space-y-6">
              <HostFacilitiesPanel property={property} onSaved={setProperty} />
            </div>
          )}

          {tab === "place" && (
            <div className="space-y-6">
              <HostPlaceForm property={property} onSaved={setProperty} />
            </div>
          )}

          {tab === "print" && (
            <div className="space-y-6">
              <HostPrintPanel property={property} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
