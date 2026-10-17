import { HttpsError, onCall } from "firebase-functions/v2/https";
import { catchUpNotice, catchUpTypeLabel, proposeCatchUpSlots, type CatchUpSlot } from "../../shared/catchup-agent";
import { CALLABLE, db, requireAccount } from "./admin";
import { enforceRateLimit, isAnonymousAuth, noteAppCheck } from "./abuse";
import { fanOut } from "./notifications";

interface CatchUpDoc {
  id: string;
  requesterUid?: string;
  requesterName?: string;
  targetOwnerUid?: string;
  targetHandle?: string;
  type?: string;
  date?: string;
  time?: string;
  venue?: string;
  status?: string;
  proposals?: CatchUpSlot[];
  conversationId?: string;
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

async function displayName(uid: string, fallback: string): Promise<string> {
  if (!uid) return fallback;
  const snap = await db.collection("users").doc(uid).get();
  const name = str(snap.data()?.displayName) || str(snap.data()?.name);
  return name || fallback;
}

export const scheduleCatchUp = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "scheduleCatchUp");
  const uid = requireAccount(request, "Sign in to schedule a catch-up.");
  await enforceRateLimit(uid, "planWrite", isAnonymousAuth(request));

  const data = (request.data || {}) as { catchupId?: string; action?: string; slotId?: string };
  const catchupId = str(data.catchupId);
  const action = str(data.action);
  if (!catchupId) throw new HttpsError("invalid-argument", "catchupId is required.");
  if (action !== "open" && action !== "accept") {
    throw new HttpsError("invalid-argument", "Choose open or accept.");
  }

  const ref = db.collection("catchups").doc(catchupId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "That catch-up is no longer available.");
  const row = { id: snap.id, ...(snap.data() as Omit<CatchUpDoc, "id">) };
  const requesterUid = str(row.requesterUid);
  const ownerUid = str(row.targetOwnerUid);
  if (uid !== requesterUid && uid !== ownerUid) {
    throw new HttpsError("permission-denied", "Only the two people on this catch-up can schedule it.");
  }

  const typeLabel = catchUpTypeLabel(row.type);
  const who = str(row.requesterName) || (await displayName(requesterUid, "Someone"));
  const ownerName = ownerUid ? await displayName(ownerUid, "them") : "them";

  if (action === "open") {
    if (Array.isArray(row.proposals) && row.proposals.length > 0) {
      return {
        ok: true,
        proposals: row.proposals,
        status: row.status || "pending",
      };
    }
    const proposals = proposeCatchUpSlots({
      now: new Date(),
      requestedDate: str(row.date) || undefined,
      requestedTime: str(row.time) || undefined,
    });
    if (proposals.length === 0) {
      throw new HttpsError("failed-precondition", "No open times in the next few days. Pick a later date.");
    }
    await ref.set({ proposals, status: row.status || "pending" }, { merge: true });
    if (ownerUid && ownerUid !== uid) {
      const notice = catchUpNotice({
        phase: "proposed",
        who,
        typeLabel,
        slot: proposals[0],
        handle: str(row.targetHandle) || undefined,
      });
      await fanOut({
        uids: [ownerUid],
        kind: notice.kind,
        title: notice.title,
        body: notice.body,
        promotionId: "",
        href: notice.href,
      });
    }
    return { ok: true, proposals, status: row.status || "pending" };
  }

  const proposals =
    Array.isArray(row.proposals) && row.proposals.length > 0
      ? row.proposals
      : proposeCatchUpSlots({
          now: new Date(),
          requestedDate: str(row.date) || undefined,
          requestedTime: str(row.time) || undefined,
        });
  const slotId = str(data.slotId) || proposals[0]?.id || "";
  const chosen = proposals.find((slot) => slot.id === slotId);
  if (!chosen) throw new HttpsError("invalid-argument", "Pick one of the suggested times.");
  if (row.status === "scheduled" && str(row.date) === chosen.date && str(row.time) === chosen.time) {
    return { ok: true, proposals, status: "scheduled", slot: chosen };
  }
  await ref.set(
    {
      proposals,
      status: "scheduled",
      date: chosen.date,
      time: chosen.time,
    },
    { merge: true },
  );
  const other = uid === requesterUid ? ownerUid : requesterUid;
  if (other) {
    const notice = catchUpNotice({
      phase: "scheduled",
      who: uid === requesterUid ? who : ownerName,
      typeLabel,
      slot: chosen,
      handle: str(row.targetHandle) || undefined,
    });
    await fanOut({
      uids: [other],
      kind: notice.kind,
      title: notice.title,
      body: notice.body,
      promotionId: "",
      href: notice.href,
    });
  }
  return { ok: true, proposals, status: "scheduled", slot: chosen };
});
