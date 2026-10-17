import { AtSign, Building2, ExternalLink, Handshake, Plus, User, Users, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { bioPath } from "@shared/bio";
import { useBio } from "@/contexts/BioContext";
import { Button } from "@/components/ui/Button";

export function EventHostFields({
  title,
  hostType,
  hostName,
  hostHandle,
  collaboratorHandles,
  collaboratorInput,
  sponsorHandles,
  sponsorInput,
  onHostType,
  onHostName,
  onHostHandle,
  onCollaboratorInput,
  onAddCollaborator,
  onRemoveCollaborator,
  onSponsorInput,
  onAddSponsor,
  onRemoveSponsor,
}: {
  title: string;
  hostType: "business" | "individual";
  hostName: string;
  hostHandle: string;
  collaboratorHandles: string[];
  collaboratorInput: string;
  sponsorHandles: string[];
  sponsorInput: string;
  onHostType: (v: "business" | "individual") => void;
  onHostName: (v: string) => void;
  onHostHandle: (v: string) => void;
  onCollaboratorInput: (v: string) => void;
  onAddCollaborator: (handle: string) => void;
  onRemoveCollaborator: (handle: string) => void;
  onSponsorInput: (v: string) => void;
  onAddSponsor: (handle: string) => void;
  onRemoveSponsor: (handle: string) => void;
}) {
  const { mine, business } = useBio();

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-accent">{title}</p>
        <span className="text-[11px] text-mute flex items-center gap-1">
          <Users size={12} className="text-accent" /> AirPal Handles
        </span>
      </div>
      <p className="text-xs text-mute leading-relaxed">
        Specify whether this event is run by a business or an individual with their AirPal @handle, plus any co-hosts or
        collaborators.
      </p>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">Organised By</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onHostType("business")}
            className={cn(
              "flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-xs sm:text-sm font-semibold ring-1 transition",
              hostType === "business"
                ? "bg-brand text-white ring-brand shadow-sm"
                : "bg-paper text-mute ring-line hover:text-ink hover:bg-card",
            )}
          >
            <Building2 size={16} />
            <span>Business / Place</span>
          </button>
          <button
            type="button"
            onClick={() => onHostType("individual")}
            className={cn(
              "flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-xs sm:text-sm font-semibold ring-1 transition",
              hostType === "individual"
                ? "bg-brand text-white ring-brand shadow-sm"
                : "bg-paper text-mute ring-line hover:text-ink hover:bg-card",
            )}
          >
            <User size={16} />
            <span>Individual Host</span>
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">
            {hostType === "business" ? "Business / Organiser Name" : "Host Full Name"}
          </label>
          <input
            value={hostName}
            onChange={(e) => onHostName(e.target.value)}
            placeholder={hostType === "business" ? "e.g. The Rocks Markets" : "e.g. Sarah Jenkins"}
            className="h-12 w-full rounded-2xl border border-line bg-paper px-4 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">
            AirPal @handle (Optional)
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-mute">@</span>
            <input
              value={hostHandle}
              onChange={(e) => onHostHandle(e.target.value.replace(/^@+/, ""))}
              placeholder={hostType === "business" ? "therocksmarkets" : "sarah"}
              className="h-12 w-full rounded-2xl border border-line bg-paper pl-8 pr-4 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
        </div>
      </div>

      {(business?.handle || mine?.handle) && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] font-medium text-mute">Autofill:</span>
          {business?.handle && (
            <button
              type="button"
              onClick={() => {
                onHostType("business");
                onHostName(business.name);
                onHostHandle(business.handle);
                toast.success(`Filled business: ${business.name} (@${business.handle})`);
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-paper px-3 py-1 text-[11px] font-semibold text-ink border border-line hover:border-brand hover:text-accent transition shadow-xs"
            >
              <Building2 size={12} className="text-accent" />
              <span>Business (@{business.handle})</span>
            </button>
          )}
          {mine?.handle && (
            <button
              type="button"
              onClick={() => {
                onHostType("individual");
                onHostName(mine.name);
                onHostHandle(mine.handle);
                toast.success(`Filled personal: ${mine.name} (@${mine.handle})`);
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-paper px-3 py-1 text-[11px] font-semibold text-ink border border-line hover:border-brand hover:text-accent transition shadow-xs"
            >
              <User size={12} className="text-accent" />
              <span>My Handle (@{mine.handle})</span>
            </button>
          )}
        </div>
      )}

      <div className="pt-3 border-t border-line/60 space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-mute block">
            Extra Hosts & Co-hosts
          </label>
          <span className="text-[11px] text-mute">{collaboratorHandles.length} added</span>
        </div>
        <p className="text-[11px] text-mute">
          Add more hosts running the event with you — each links to their AirPal bio on the public page.
        </p>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-mute">@</span>
            <input
              value={collaboratorInput}
              onChange={(e) => onCollaboratorInput(e.target.value.replace(/^@+/, ""))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onAddCollaborator(collaboratorInput);
                }
              }}
              placeholder="collab_handle"
              className="h-11 w-full rounded-2xl border border-line bg-paper pl-8 pr-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <Button
            type="button"
            variant="tonal"
            size="sm"
            onClick={() => onAddCollaborator(collaboratorInput)}
            disabled={!collaboratorInput.trim()}
            className="h-11 px-4 gap-1.5 rounded-2xl"
          >
            <Plus size={15} />
            <span>Add</span>
          </Button>
        </div>

        {collaboratorHandles.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {collaboratorHandles.map((handle) => (
              <div
                key={handle}
                className="inline-flex items-center gap-1.5 rounded-full bg-paper px-3 py-1.5 text-xs font-semibold text-ink border border-line shadow-xs group"
              >
                <AtSign size={12} className="text-accent" />
                <span>{handle}</span>
                <a
                  href={bioPath(handle)}
                  target="_blank"
                  rel="noreferrer"
                  title="Preview profile"
                  className="text-mute hover:text-accent transition p-0.5"
                >
                  <ExternalLink size={11} />
                </a>
                <button
                  type="button"
                  onClick={() => onRemoveCollaborator(handle)}
                  title="Remove collaborator"
                  aria-label={`Remove ${handle} as co-host`}
                  className="ml-0.5 rounded-full p-0.5 text-mute hover:bg-rose-100 hover:text-rose-700 transition"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-line/60 space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-mute flex items-center gap-1.5">
            <Handshake size={13} className="text-amber-600 dark:text-amber-400" aria-hidden="true" />
            <span>Sponsors</span>
          </label>
          <span className="text-[11px] text-mute">{sponsorHandles.length} added</span>
        </div>
        <p className="text-[11px] text-mute">
          Backing brands and venues — each sponsor @handle gets its own row on the public page.
        </p>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-mute">@</span>
            <input
              value={sponsorInput}
              onChange={(e) => onSponsorInput(e.target.value.replace(/^@+/, ""))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onAddSponsor(sponsorInput);
                }
              }}
              placeholder="sponsor_handle"
              aria-label="Sponsor @handle"
              className="h-11 w-full rounded-2xl border border-line bg-paper pl-8 pr-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <Button
            type="button"
            variant="tonal"
            size="sm"
            onClick={() => onAddSponsor(sponsorInput)}
            disabled={!sponsorInput.trim()}
            className="h-11 px-4 gap-1.5 rounded-2xl"
          >
            <Plus size={15} />
            <span>Add</span>
          </Button>
        </div>

        {sponsorHandles.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {sponsorHandles.map((handle) => (
              <div
                key={handle}
                className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-ink border border-amber-500/25 shadow-xs group"
              >
                <Handshake size={12} className="text-amber-600 dark:text-amber-400" />
                <span>{handle}</span>
                <a
                  href={bioPath(handle)}
                  target="_blank"
                  rel="noreferrer"
                  title="Preview profile"
                  className="text-mute hover:text-accent transition p-0.5"
                >
                  <ExternalLink size={11} />
                </a>
                <button
                  type="button"
                  onClick={() => onRemoveSponsor(handle)}
                  title="Remove sponsor"
                  aria-label={`Remove ${handle} as sponsor`}
                  className="ml-0.5 rounded-full p-0.5 text-mute hover:bg-rose-100 hover:text-rose-700 transition"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
