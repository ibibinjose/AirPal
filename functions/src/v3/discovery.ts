import { onCall } from "firebase-functions/v2/https";
import {
  cleanV3Text,
  parseV3Handle,
  parseV3ListLimit,
  publicV3Deal,
  publicV3Event,
  publicV3Place,
  readableV3Profile,
  type V3Deal,
  type V3Event,
  type V3FetchHandleRequest,
  type V3ListPublicQuery,
  type V3Place,
  type V3Profile,
} from "../../../shared/v3-contract";
import { CALLABLE, db } from "../admin";
import { enforceRateLimit, isAnonymousAuth, noteAppCheck } from "../abuse";
import { v3Arg } from "./common";

type DiscoveryRequest = {
  auth?: { uid?: string; token?: { firebase?: { sign_in_provider?: string } } };
  data?: unknown;
};

/**
 * Public discovery is not account-affecting, so unauthenticated callers are
 * allowed under anonymous rate limits. Responses are sanitised projections:
 * no owner, trust, or money state beyond the ticket price.
 */
async function discoveryKey(request: DiscoveryRequest, action: string) {
  await noteAppCheck(request, action);
  const uid = request.auth?.uid || "anonymous";
  await enforceRateLimit(uid, "v3Discovery", !request.auth?.uid || isAnonymousAuth(request));
}

function pageLimit(data: V3ListPublicQuery): number {
  return v3Arg(() => parseV3ListLimit(data.limit));
}

function pageCity(data: V3ListPublicQuery): string | null {
  const city = cleanV3Text(data.city, 80);
  return city ? city : null;
}

export const v3ListPlaces = onCall(CALLABLE, async (request) => {
  await discoveryKey(request, "v3ListPlaces");
  const data = (request.data || {}) as V3ListPublicQuery;
  const limit = pageLimit(data);
  const city = pageCity(data);
  let query = db.collection("places").where("status", "==", "published").orderBy("createdAt", "desc");
  if (city)
    query = db
      .collection("places")
      .where("status", "==", "published")
      .where("city", "==", city)
      .orderBy("createdAt", "desc");
  const cursor = cleanV3Text(data.cursor, 120);
  if (cursor) {
    const cursorSnap = await db.collection("places").doc(cursor).get();
    if (cursorSnap.exists) query = query.startAfter(cursorSnap) as typeof query;
  }
  const snap = await query.limit(limit).get();
  return {
    places: snap.docs.map((doc) => publicV3Place({ id: doc.id, ...(doc.data() as V3Place) })),
    nextCursor: snap.docs.length === limit ? snap.docs[snap.docs.length - 1]!.id : null,
  };
});

export const v3ListEvents = onCall(CALLABLE, async (request) => {
  await discoveryKey(request, "v3ListEvents");
  const data = (request.data || {}) as V3ListPublicQuery;
  const limit = pageLimit(data);
  const city = pageCity(data);
  let query = db.collection("events").where("status", "==", "published").orderBy("startsAt", "asc");
  if (city)
    query = db
      .collection("events")
      .where("status", "==", "published")
      .where("city", "==", city)
      .orderBy("startsAt", "asc");
  const cursor = cleanV3Text(data.cursor, 120);
  if (cursor) {
    const cursorSnap = await db.collection("events").doc(cursor).get();
    if (cursorSnap.exists) query = query.startAfter(cursorSnap) as typeof query;
  }
  const snap = await query.limit(limit).get();
  return {
    events: snap.docs.map((doc) => publicV3Event({ id: doc.id, ...(doc.data() as V3Event) })),
    nextCursor: snap.docs.length === limit ? snap.docs[snap.docs.length - 1]!.id : null,
  };
});

export const v3ListDeals = onCall(CALLABLE, async (request) => {
  await discoveryKey(request, "v3ListDeals");
  const data = (request.data || {}) as V3ListPublicQuery;
  const limit = pageLimit(data);
  const snap = await db
    .collection("deals")
    .where("status", "==", "published")
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  return {
    deals: snap.docs.map((doc) => publicV3Deal({ id: doc.id, ...(doc.data() as V3Deal) })),
    nextCursor: snap.docs.length === limit ? snap.docs[snap.docs.length - 1]!.id : null,
  };
});

/**
 * Resolve a public handle to its sanitised profile. Private profiles resolve
 * to the handle alone so the handle stays routable without leaking the bio.
 */
export const v3FetchHandle = onCall(CALLABLE, async (request) => {
  await discoveryKey(request, "v3FetchHandle");
  const data = (request.data || {}) as V3FetchHandleRequest;
  const handle = v3Arg(() => parseV3Handle(data.handle));
  const handleSnap = await db.collection("handles").doc(handle).get();
  const link = handleSnap.data() as { ownerUid?: string; active?: boolean } | undefined;
  if (!handleSnap.exists || link?.active !== true || !link.ownerUid) {
    return { handle, found: false as const };
  }
  const profileSnap = await db.collection("profiles").doc(link.ownerUid).get();
  const profile = profileSnap.data() as V3Profile | undefined;
  if (!profileSnap.exists || !profile || profile.visibility !== "public") {
    return { handle, found: true as const, ownerUid: link.ownerUid, profile: null };
  }
  return { handle, found: true as const, ownerUid: link.ownerUid, profile: readableV3Profile(profile) };
});
