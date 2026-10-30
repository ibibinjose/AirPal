import type { FormEvent } from "react";
import { Link } from "wouter";
import { Globe2, MapPin, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { fieldInput, fieldTextarea } from "@/components/forms/ValidField";
import { AddressFields } from "@/components/forms/AddressFields";
import { TradingHoursField } from "@/components/forms/TradingHoursField";
import { ImageField } from "@/components/media/ImageField";
import { PhoneField } from "@/components/forms/PhoneField";
import { HostFreshnessBanner } from "@/components/host/HostFreshnessBanner";
import { GooglePlaceImportCard } from "@/components/business/GooglePlaceImport";
import { BUSINESS_CATEGORIES, type BusinessCategoryId, type BusinessListing } from "@shared/business";
import { formatGps, type AddressParts } from "@shared/geo-address";
import type { GooglePlaceImport } from "@shared/google-place";
import { triggerHapticSelection } from "@/lib/native";
import { cn } from "@/lib/cn";

export interface VenueProfileValues {
  name: string;
  address: AddressParts;
  hours: string;
  shortWhy: string;
  description: string;
  phone: string;
  geo?: { lat: number; lng: number };
  category: BusinessCategoryId;
  hero: string;
}

export interface VenueProfileTabProps {
  listing: Pick<BusinessListing, "mapsPlaceId" | "handle" | "hoursVerifiedAt" | "updatedAt">;
  values: VenueProfileValues;
  onChange: (patch: Partial<VenueProfileValues>) => void;
  busy: boolean;
  locating: boolean;
  onSubmit: (e: FormEvent) => void;
  onImportPlace: (place: GooglePlaceImport) => void;
  onHeroChange: (src: string) => void;
  onLocate: () => void;
  onConfirmHours: () => Promise<void>;
}

/**
 * TAB 2 of the Business hub: Google Place sync + the venue details form.
 * Purely presentational — all state and server writes stay in the page so
 * the header preview, guest view, and bio sync keep reading live edits.
 */
export function VenueProfileTab({
  listing,
  values,
  onChange,
  busy,
  locating,
  onSubmit,
  onImportPlace,
  onHeroChange,
  onLocate,
  onConfirmHours,
}: VenueProfileTabProps) {
  const { name, address, hours, shortWhy, description, phone, geo, category, hero } = values;
  return (
    <div className="space-y-6">
      {/* Google Place Quick Sync Card */}
      <section className="neu-section p-5 sm:p-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-display text-base font-bold text-ink">Google Place Sync</h2>
            <p className="text-xs text-mute">Instantly import hours, GPS coordinates, photos, and address</p>
          </div>
          <Globe2 className="h-4 w-4 text-accent" />
        </div>
        <GooglePlaceImportCard importedPlaceId={listing.mapsPlaceId} onImport={onImportPlace} />
        <p className="mt-3 text-xs sm:text-sm text-mute">
          Managing an existing public listing?{" "}
          <Link href="/claim" className="font-semibold text-accent underline-offset-2 hover:underline">
            Claim &amp; verify ownership
          </Link>{" "}
          for the official Verified Partner badge.
        </p>
      </section>

      {/* Venue Form */}
      <form className="neu-section p-5 sm:p-6 space-y-5" onSubmit={onSubmit}>
        <div>
          <h2 className="font-display text-base font-bold text-ink">Venue Details & Media</h2>
          <p className="text-xs text-mute">Showcase your venue to neighbourhood visitors and locals</p>
        </div>

        {/* Hero Image */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-mute mb-2">Hero Cover Photo</label>
          <ImageField kind="hero" folder="listings" value={hero} onChange={(src) => onHeroChange(src || "")} />
        </div>

        {/* Name */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-mute mb-1">
            Business / Venue Name
          </label>
          <input
            value={name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="e.g. The Rocks Cafe"
            className={fieldInput}
            required
          />
        </div>

        {/* Category Pills */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-mute mb-2">Primary Category</label>
          <div className="flex flex-wrap gap-2">
            {BUSINESS_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  if (category !== c.id) void triggerHapticSelection();
                  onChange({ category: c.id });
                }}
                className={cn(
                  "min-h-[44px] rounded-2xl px-3.5 text-xs font-semibold transition active:scale-95 shadow-2xs cursor-pointer",
                  category === c.id ? "bg-brand text-white shadow-sm" : "bg-paper text-ink hover:bg-card",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Location & GPS */}
        <div className="border-t border-line/60 pt-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-mute">
                Physical Location & GPS
              </label>
              <p className="text-[11px] text-mute">Used for neighbourhood search and walking distances</p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outlined"
              disabled={locating}
              onClick={onLocate}
              className="gap-1.5 shrink-0 whitespace-nowrap"
            >
              <MapPin className="h-3.5 w-3.5 shrink-0 text-accent" />
              {locating ? "Locating…" : geo ? `GPS Pinned (${formatGps(geo.lat, geo.lng)})` : "Use My Location"}
            </Button>
          </div>
          <AddressFields value={address} onChange={(next) => onChange({ address: next })} />
          {!address.line1.trim() && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Add your street address — the suburb alone is not enough to save.
            </p>
          )}
        </div>

        {/* Hours & Freshness */}
        <div className="border-t border-line/60 pt-4 space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-mute">
            Trading Hours & Freshness
          </label>
          <TradingHoursField value={hours} onChange={(next) => onChange({ hours: next })} inputClassName={fieldInput} />
          <HostFreshnessBanner
            kind="hours"
            at={listing.hoursVerifiedAt || listing.updatedAt}
            onConfirm={onConfirmHours}
          />
        </div>

        {/* Pitch, Description & Phone */}
        <div className="border-t border-line/60 pt-4 space-y-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-mute mb-1">
              Short Tagline / Why Visit
            </label>
            <input
              value={shortWhy}
              onChange={(e) => onChange({ shortWhy: e.target.value })}
              placeholder="e.g. Award-winning waterfront dining in Circular Quay"
              className={fieldInput}
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-mute">
                Business Description / About Venue
              </label>
              <span className="text-[10px] text-mute">{description.length}/500</span>
            </div>
            <textarea
              value={description}
              maxLength={500}
              rows={3}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="Tell visitors about your venue's story, specialty dishes, ambiance, or services…"
              className={fieldTextarea}
            />
            <p className="text-[11px] text-mute mt-1">
              Detailed overview displayed on your public place page and digital bio profile.
            </p>
          </div>
          <div>
            <PhoneField value={phone} onChange={(next) => onChange({ phone: next })} label="Direct Inquiries Phone" />
          </div>
        </div>

        <Button type="submit" size="lg" className="w-full gap-2 mt-4" disabled={busy} loading={busy}>
          <Save className="h-4 w-4" />
          Save Venue Changes
        </Button>
      </form>
    </div>
  );
}
