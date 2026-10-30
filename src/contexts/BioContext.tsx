import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { nanoid } from "nanoid";
import {
  handleError,
  handleFromPlaceId,
  normalizeHandle,
  type BioKind,
  type BioOffer,
  type BioProfile,
} from "@shared/bio";
import { getFirebaseAuth } from "@/lib/firebase";
import {
  liveBackendEnabled,
  checkHandleAvailableRemote,
  recordBioTapRemote,
  setBioOfferRemote,
  transferHandleRemote,
} from "@/lib/functions";
import { useAuth } from "@/contexts/AuthContext";
import { persistOwnedProfile } from "@/lib/bio-persist";
import { bumpTap, hydrateOwnedBios, loadBios, persistBios, subscribeBios, tapCount } from "@/lib/bio-store";
import { syncBioToListing } from "@/lib/identity";
import { placeByHandle } from "@/lib/catalog";
import { resolvePublicBio, stallByHandle } from "@/lib/bio-handle";
import { getCachedListings } from "@/lib/listings";
import { shouldKeepBusinessBio } from "@/lib/venue-bio";
import { runRemoteWrite } from "@/lib/synced-write";
import { isOpenAt } from "@/lib/hours";

type CreateBioInput = Pick<BioProfile, "handle" | "name" | "city" | "shortWhy" | "aboutText"> & {
  category?: BioProfile["category"];
  kind?: BioKind;
  registeredName?: string;
  registrationNumber?: string;
  domain?: string;
  trademark?: string;
  phone?: string;
  /** Venue trading hours, e.g. from the listing being launched. */
  hours?: string;
  geo?: BioProfile["geo"];
  propertyId?: string;
  /** Real listing identifiers for venue bios — never derived from the handle. */
  listingId?: string;
  placeId?: string;
};

type BioValue = {
  profiles: BioProfile[];
  mine: BioProfile | null;
  business: BioProfile | null;
  /** False while signed-in profiles are loading from the account. */
  biosReady: boolean;
  byHandle: (handle: string) => BioProfile | undefined;
  handleFree: (handle: string, exceptId?: string) => Promise<{ ok: boolean; reason?: string }>;
  createProfile: (input: CreateBioInput) => Promise<BioProfile>;
  updateProfile: (patch: Partial<BioProfile> & { handle: string }) => Promise<void>;
  setOffer: (handle: string, offer: BioOffer | null) => Promise<void>;
  transferHandle: (from: string, to: string) => Promise<string>;
  recordTap: (handle: string, kind?: string, linkId?: string) => void;
  tapsToday: (handle: string) => number;
};

const BioContext = createContext<BioValue | undefined>(undefined);

export function BioProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<BioProfile[]>(() => (typeof window === "undefined" ? [] : loadBios()));
  const [biosReady, setBiosReady] = useState(!user);

  const refresh = useCallback(() => setProfiles(loadBios()), []);

  useEffect(() => {
    refresh();
    return subscribeBios(refresh);
  }, [refresh]);

  useEffect(() => {
    if (!user) {
      setBiosReady(true);
      return;
    }
    if (!liveBackendEnabled()) {
      setBiosReady(true);
      return;
    }
    let cancelled = false;
    setBiosReady(false);
    void (async () => {
      try {
        const { rows } = await hydrateOwnedBios(user.uid);
        if (cancelled) return;
        refresh();
        const mineRows = rows.filter((row) => row.ownerUid === user.uid && row.handle);
        for (const row of mineRows) {
          // Best-effort re-sync: failures stay on device; the next save retries.
          await runRemoteWrite({
            runJob: undefined,
            jobId: `bio-hydrate-${row.id}`,
            label: "Bio",
            remote: () => persistOwnedProfile(row),
            policy: "direct-best-effort",
          });
        }
        if (cancelled) return;
        refresh();
      } finally {
        if (!cancelled) setBiosReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh, user?.uid]);

  const owned = useMemo(() => {
    if (!user) return profiles.filter((p) => p.ownerEmail || p.ownerUid || p.id.startsWith("bio-"));
    return profiles.filter((p) => p.ownerUid === user.uid || p.ownerEmail === user.email);
  }, [profiles, user]);

  const mine = useMemo(() => owned.find((p) => p.kind === "person") || owned[0] || null, [owned]);

  const business = useMemo(
    () =>
      owned.find((p) => (p.kind || "business") === "business" && p.kind !== "person") ||
      owned.find((p) => p.kind === "business") ||
      null,
    [owned],
  );

  const byHandle = useCallback(
    (handle: string) => profiles.find((p) => p.handle === normalizeHandle(handle)),
    [profiles],
  );

  const tapsToday = useCallback((handle: string) => tapCount(handle), []);

  const recordTap = useCallback((handle: string, kind?: string, linkId?: string) => {
    bumpTap(handle);
    if (liveBackendEnabled()) {
      void recordBioTapRemote({ handle, kind: kind || "view", linkId }).catch(() => undefined);
    }
  }, []);

  const handleFree = useCallback(
    async (handle: string, exceptId?: string) => {
      const err = handleError(handle);
      if (err) return { ok: false, reason: err };
      const h = normalizeHandle(handle);
      const skip = exceptId || "";
      const currentUid = getFirebaseAuth()?.currentUser?.uid || user?.uid;
      const currentEmail = getFirebaseAuth()?.currentUser?.email || user?.email;
      const existing = loadBios().find(
        (p) =>
          p.handle === h &&
          p.id !== skip &&
          !(currentUid && p.ownerUid === currentUid) &&
          !(currentEmail && p.ownerEmail === currentEmail),
      );
      if (existing) return { ok: false, reason: "Taken" };
      // A listing only blocks a handle when someone else owns it — your own
      // venue's listing must NOT block your venue bio from using its handle.
      const listingHit = getCachedListings().find(
        (row) =>
          row.handle === h &&
          row.id !== skip &&
          !(currentUid && row.ownerUid === currentUid) &&
          !(currentEmail && row.ownerEmail === currentEmail),
      );
      if (listingHit) return { ok: false, reason: "Taken" };
      if (liveBackendEnabled()) {
        try {
          const res = await checkHandleAvailableRemote({ handle: h });
          if (!res.ok) return { ok: false, reason: res.reason || "Taken" };
        } catch {
          /* local already checked */
        }
      }
      return { ok: true };
    },
    [user],
  );

  const createProfile = useCallback(
    async (input: CreateBioInput) => {
      const h = normalizeHandle(input.handle);
      const err = handleError(h);
      if (err) throw new Error(err);
      const kind: BioKind = input.kind || "person";
      const place = placeByHandle(h);
      const stall = stallByHandle(h);
      // Match the caller's listing first: the cached listing may not carry a
      // handle yet, so also match the handle derived from its place id.
      const listing = getCachedListings().find(
        (row) =>
          (input.listingId && row.id === input.listingId) ||
          (input.placeId && row.placeId === input.placeId) ||
          row.handle === h ||
          handleFromPlaceId(row.placeId) === h ||
          (Boolean(business?.listingId) && row.id === business?.listingId),
      );
      const listingId = kind === "business" ? input.listingId || listing?.id : business?.listingId;
      // Business inheritance is scoped to the same venue listing: a second
      // venue starts fresh instead of copying the first venue's about text,
      // hours, and photos. Personal profiles keep the single-identity rule.
      const keep =
        kind === "business"
          ? shouldKeepBusinessBio(business, listingId)
            ? business
            : null
          : mine?.kind === "person"
            ? mine
            : null;
      const sameKind = keep;
      const currentUid = getFirebaseAuth()?.currentUser?.uid || user?.uid;
      const currentEmail = getFirebaseAuth()?.currentUser?.email || user?.email;
      const existing = loadBios().find((p) => p.handle === h);
      const isMyOwn = Boolean(
        existing &&
        ((currentUid && existing.ownerUid === currentUid) || (currentEmail && existing.ownerEmail === currentEmail)),
      );
      if (existing && existing.id !== sameKind?.id) {
        // Never convert a profile from one kind to another in place — that is
        // how launching a venue destroys the owner's personal profile.
        // (Kind-less legacy bios predate venues, so they count as personal.)
        if ((existing.kind || "person") !== kind) {
          throw new Error(
            (existing.kind || "person") === "person"
              ? "That handle is your personal profile — pick a different venue handle."
              : "That handle is already a venue profile — pick a different handle.",
          );
        }
        if (!isMyOwn) throw new Error("Taken");
      }
      const finalHours =
        (kind === "business" ? input.hours?.trim() || listing?.hours?.trim() : undefined) ||
        keep?.hours ||
        place?.hours ||
        (kind === "person" ? "" : stall ? "Market hours" : "See bio");
      const profile: BioProfile = {
        id: keep?.id || existing?.id || `bio-${nanoid(8)}`,
        handle: h,
        kind,
        ownerUid: getFirebaseAuth()?.currentUser?.uid || user?.uid,
        ownerEmail: getFirebaseAuth()?.currentUser?.email || user?.email,
        name: input.name.trim(),
        shortWhy: input.shortWhy.trim(),
        aboutText: input.aboutText?.trim() || listing?.description?.trim() || keep?.aboutText || undefined,
        city: input.city.trim() || "Sydney",
        category: input.category || keep?.category || (kind === "person" ? "services" : "eat"),
        hours: finalHours,
        openNow:
          kind === "business" && finalHours
            ? (isOpenAt(finalHours, new Date(), "Australia/Sydney") ?? true)
            : (keep?.openNow ?? place?.openNow ?? true),
        phone: input.phone || keep?.phone || listing?.phone || place?.phone,
        geo: input.geo || keep?.geo || listing?.geo || place?.geo,
        avatar: keep?.avatar || listing?.heroImage || place?.heroImage,
        cover: keep?.cover || listing?.heroImage || place?.heroImage || place?.photos?.[0],
        offer:
          keep?.offer ||
          (place?.deal ? { badge: place.deal.badge, detail: place.deal.detail } : undefined) ||
          (stall?.offer ? { badge: "Market", detail: stall.offer } : undefined),
        products: keep?.products || [],
        services: keep?.services || [],
        deals: keep?.deals || [],
        links: keep?.links || [],
        placeId: input.placeId || keep?.placeId || place?.id,
        listingId,
        propertyId: input.propertyId || keep?.propertyId,
        stallId: keep?.stallId || stall?.id,
        eventId: keep?.eventId || stall?.eventId,
        mapsPlaceId: keep?.mapsPlaceId || place?.mapsPlaceId,
        registeredName: input.registeredName?.trim() || keep?.registeredName,
        registrationNumber: input.registrationNumber?.trim() || keep?.registrationNumber,
        domain: input.domain?.trim() || keep?.domain,
        trademark: input.trademark?.trim() || keep?.trademark,
        // Venues are public storefronts: an undefined visibility falls back to
        // friends-only gating elsewhere, which locks the owner out too.
        visibility: "public",
      };
      persistBios([
        profile,
        ...loadBios().filter(
          (p) =>
            p.handle !== h &&
            p.id !== profile.id &&
            // One profile per owner per kind — except venues: a second
            // venue's bio must not wipe the first venue's bio.
            !(
              p.ownerUid &&
              p.ownerUid === profile.ownerUid &&
              (p.kind || "business") === kind &&
              (p.listingId || null) === (profile.listingId || null)
            ),
        ),
      ]);
      if (kind === "business") syncBioToListing(profile);
      refresh();
      await runRemoteWrite({
        runJob: undefined,
        jobId: `bio-${profile.id}`,
        label: "Bio",
        remote: () => persistOwnedProfile(profile),
        policy: "direct-best-effort",
        onError: (err) => console.warn("Could not sync profile to remote:", err),
      });
      return profile;
    },
    [business, mine, refresh, user],
  );

  const updateProfile = useCallback(
    async (patch: Partial<BioProfile> & { handle: string }) => {
      const h = normalizeHandle(patch.handle);
      const allBios = loadBios();
      let current = allBios.find((p) => normalizeHandle(p.handle) === h);
      if (!current) {
        current =
          profiles.find((p) => normalizeHandle(p.handle) === h) ||
          (mine && normalizeHandle(mine.handle) === h ? mine : undefined) ||
          resolvePublicBio(h, (hd) => profiles.find((p) => normalizeHandle(p.handle) === hd));
      }
      if (!current) {
        current = {
          id: `bio-${h}`,
          handle: h,
          kind: "person",
          name: h,
          shortWhy: "",
          city: "Sydney",
          category: "services",
          hours: "",
          openNow: true,
          products: [],
          services: [],
          deals: [],
          links: [],
        };
      }
      const next: BioProfile = { ...current, ...patch, handle: h };
      if (patch.deals)
        next.offer = next.deals[0]
          ? { badge: next.deals[0].badge || next.deals[0].title, detail: next.deals[0].detail }
          : undefined;
      persistBios([next, ...allBios.filter((p) => normalizeHandle(p.handle) !== h)]);
      if ((next.kind || "business") === "business") syncBioToListing(next);
      refresh();
      await runRemoteWrite({
        runJob: undefined,
        jobId: `bio-${next.id}`,
        label: "Bio",
        remote: () => persistOwnedProfile(next),
        policy: "direct-best-effort",
        onError: (err) => console.warn("Could not persist profile remotely:", err),
      });
    },
    [mine, profiles, refresh],
  );

  const setOffer = useCallback(
    async (handle: string, offer: BioOffer | null) => {
      const current = loadBios().find((p) => p.handle === handle);
      if (!current) return;
      const next = { ...current, offer: offer || undefined };
      persistBios([next, ...loadBios().filter((p) => p.handle !== handle)]);
      syncBioToListing(next);
      refresh();
      if (liveBackendEnabled() && getFirebaseAuth()?.currentUser) {
        try {
          await setBioOfferRemote({
            handle,
            badge: offer?.badge || "",
            detail: offer?.detail || "",
            active: Boolean(offer),
          });
        } catch {
          /* local save already applied */
        }
      }
    },
    [refresh],
  );

  const transferHandle = useCallback(
    async (from: string, to: string) => {
      const err = handleError(to);
      if (err) throw new Error(err);
      const h = normalizeHandle(to);
      const current = loadBios().find((p) => p.handle === from);
      if (!current) throw new Error("No profile");
      const taken = loadBios().some((p) => p.handle === h && p.id !== current.id);
      if (taken) throw new Error("Taken");
      if (getCachedListings().some((row) => row.handle === h && row.id !== current.listingId)) throw new Error("Taken");
      let profileId = current.id;
      if (liveBackendEnabled() && getFirebaseAuth()?.currentUser) {
        const res = await transferHandleRemote({ from, to: h });
        if (res.profileId) profileId = res.profileId;
      }
      const next = { ...current, handle: h, id: profileId };
      persistBios([next, ...loadBios().filter((p) => p.handle !== from && p.handle !== h && p.id !== current.id)]);
      syncBioToListing(next);
      refresh();
      return h;
    },
    [refresh],
  );

  const value = useMemo<BioValue>(
    () => ({
      profiles,
      mine,
      business,
      biosReady,
      byHandle,
      tapsToday,
      recordTap,
      handleFree,
      createProfile,
      updateProfile,
      setOffer,
      transferHandle,
    }),
    [
      biosReady,
      business,
      byHandle,
      createProfile,
      handleFree,
      mine,
      profiles,
      recordTap,
      setOffer,
      tapsToday,
      transferHandle,
      updateProfile,
    ],
  );

  return <BioContext.Provider value={value}>{children}</BioContext.Provider>;
}

export function useBio() {
  const ctx = useContext(BioContext);
  if (!ctx) throw new Error("useBio");
  return ctx;
}
