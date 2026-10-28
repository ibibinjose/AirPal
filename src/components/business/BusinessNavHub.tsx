import { Link } from "wouter";
import {
  Building2,
  ClipboardList,
  Gift,
  Headphones,
  PlusCircle,
  Settings2,
  ShieldCheck,
  Sunrise,
  Tag,
  Ticket,
} from "lucide-react";
import { TabPills } from "@/components/ui/TabPills";

export type BusinessRoleDomain = "venue" | "bookings" | "experiences" | "promotions" | "onboard";

export type BusinessNavTab = "tonight" | "venue" | "bookings" | "list" | "offer";

interface BusinessNavHubProps {
  activeTab: BusinessNavTab;
  onTabChange: (tab: BusinessNavTab) => void;
  listingActive: boolean;
  dealLive: boolean;
  campaignCount: number;
  bookingCount: number;
}

export function BusinessNavHub({
  activeTab,
  onTabChange,
  listingActive,
  dealLive,
  campaignCount,
  bookingCount,
}: BusinessNavHubProps) {
  return (
    <div className="space-y-4">
      {/* Domain Role Quick Cards */}
      <div className="rounded-3xl ring-1 ring-line bg-card p-4 sm:p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
          <div className="min-w-0 flex-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">Your place</span>
            <p className="mt-0.5 truncate text-sm text-mute">Workspace & live status</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/claim"
              className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-paper px-3.5 py-2 text-xs font-semibold text-ink hover:bg-card transition-[background-color,transform] shadow-2xs active:scale-95"
            >
              <ShieldCheck size={14} className="shrink-0 text-accent" />
              <span>Claim Venue</span>
            </Link>
            <Link
              href="/business/onboard"
              className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-paper px-3.5 py-2 text-xs font-semibold text-ink hover:bg-card transition-[background-color,transform] shadow-2xs active:scale-95"
            >
              <PlusCircle size={14} className="shrink-0 text-accent" />
              <span>Add Venue</span>
            </Link>
          </div>
        </div>

        {/* Operational Metrics Strip — 2x2 on mobile, 4-col on sm+ */}
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <div className="min-w-0 rounded-2xl bg-paper p-2.5 ring-1 ring-line">
            <p className="truncate text-xs font-bold text-ink">{listingActive ? "Live" : "Draft"}</p>
            <p className="truncate text-[11px] text-mute">Listing</p>
          </div>
          <div className="min-w-0 rounded-2xl bg-paper p-2.5 ring-1 ring-line">
            <p className="truncate text-xs font-bold text-ink">{dealLive ? "Active" : "Off"}</p>
            <p className="truncate text-[11px] text-mute">Offer</p>
          </div>
          <div className="min-w-0 rounded-2xl bg-paper p-2.5 ring-1 ring-line">
            <p className="truncate text-xs font-bold text-ink">{campaignCount}</p>
            <p className="truncate text-[11px] text-mute">Campaigns</p>
          </div>
          <div className="min-w-0 rounded-2xl bg-paper p-2.5 ring-1 ring-line">
            <p className="truncate text-xs font-bold text-ink">{bookingCount}</p>
            <p className="truncate text-[11px] text-mute">Bookings</p>
          </div>
        </div>

        {/* Workspace Quick Actions */}
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-line/60 pt-3 text-xs font-semibold">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/business/setup"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-paper px-3.5 text-accent ring-1 ring-line hover:bg-card transition-[background-color,color]"
            >
              <Settings2 size={13} />
              <span>Setup Checklist</span>
            </Link>
            <Link
              href="/help"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-paper px-3.5 text-ink/80 ring-1 ring-line hover:text-ink hover:bg-card transition-[background-color,color]"
            >
              <Headphones size={13} aria-hidden />
              <span>Help Centre</span>
            </Link>
          </div>
          <Link
            href="/business/promotions"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-paper px-3.5 text-ink/80 ring-1 ring-line hover:text-accent hover:bg-card transition-[background-color,color]"
          >
            <Gift size={13} className="text-accent" />
            <span>Promotions Studio</span>
          </Link>
        </div>
      </div>

      {/* Role Domain Navigation Bar */}
      <TabPills
        ariaLabel="Business sections"
        items={[
          { id: "tonight", label: "Tonight", icon: Sunrise },
          { id: "venue", label: "Venue", icon: Building2, badge: listingActive ? "Live" : "Draft" },
          { id: "bookings", label: "Bookings", icon: Ticket, badge: String(bookingCount) },
          { id: "list", label: "Door List", icon: ClipboardList, badge: "Live" },
          { id: "offer", label: "Offers", icon: Tag, badge: dealLive ? "Live" : "Off" },
        ]}
        active={activeTab}
        onChange={onTabChange}
      />
    </div>
  );
}
