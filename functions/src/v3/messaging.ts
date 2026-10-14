import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import {
  isV3ConversationKind,
  parseV3Id,
  parseV3Uid,
  requiredV3Text,
  type V3Conversation,
  type V3SendMessageRequest,
  type V3StartConversationRequest,
} from "../../../shared/v3-contract";
import { CALLABLE, db, requireAccount } from "../admin";
import { enforceRateLimit, noteAppCheck } from "../abuse";
import { indexUserDoc, randomDocId, v3Arg, v3Clean } from "./common";

/**
 * The universal conversation model. Message bodies live in a server-only
 * subcollection; clients read the conversation projection (participants,
 * preview, timestamp) by id. There is no second chat engine.
 */
export const v3StartConversation = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "v3StartConversation");
  const uid = requireAccount(request, "Create an email account to message.");
  await enforceRateLimit(uid, "v3Message", false);
  const data = (request.data || {}) as V3StartConversationRequest;
  if (!isV3ConversationKind(data.kind)) throw new HttpsError("invalid-argument", "Conversation kind is invalid.");
  const input = v3Arg(() => ({
    participantUids: ((data.participantUids || []) as unknown[]).map((row) => parseV3Uid(row, "Participant")),
    planId: data.planId === undefined ? undefined : parseV3Id(data.planId, "Plan"),
    eventId: data.eventId === undefined ? undefined : parseV3Id(data.eventId, "Event"),
  }));
  const participants = [...new Set([uid, ...input.participantUids])];
  if (data.kind === "direct") {
    if (participants.length !== 2)
      throw new HttpsError("invalid-argument", "Direct chats need exactly one other person.");
    const other = participants.find((id) => id !== uid) as string;
    const [blockOut, blockIn] = await Promise.all([
      db.collection("users").doc(uid).collection("blocks").doc(other).get(),
      db.collection("users").doc(other).collection("blocks").doc(uid).get(),
    ]);
    if (blockOut.exists || blockIn.exists) {
      throw new HttpsError("permission-denied", "This conversation is unavailable.");
    }
  }
  if (data.kind === "plan") {
    if (!input.planId) throw new HttpsError("invalid-argument", "Plan chats need a plan.");
    const member = await db.collection("plans").doc(input.planId).collection("members").doc(uid).get();
    if (!member.exists) throw new HttpsError("permission-denied", "Only plan members can start this chat.");
  }
  if (data.kind === "event") {
    if (!input.eventId) throw new HttpsError("invalid-argument", "Event chats need an event.");
    const event = await db.collection("events").doc(input.eventId).get();
    if (!event.exists) throw new HttpsError("not-found", "Event not found.");
  }
  const conversationId = randomDocId("chat");
  await db
    .collection("conversations")
    .doc(conversationId)
    .set(
      v3Clean({
        kind: data.kind,
        participantUids: participants,
        planId: input.planId,
        eventId: input.eventId,
        lastMessageAt: FieldValue.serverTimestamp(),
        lastMessagePreview: "",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }),
    );
  for (const participant of participants) {
    await indexUserDoc(participant, "conversationIds", conversationId);
  }
  return { conversationId };
});

/** Send a message. Participants only; blocked pairs cannot deliver. */
export const v3SendMessage = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "v3SendMessage");
  const uid = requireAccount(request, "Create an email account to message.");
  await enforceRateLimit(uid, "v3Message", false);
  const data = (request.data || {}) as V3SendMessageRequest;
  const input = v3Arg(() => ({
    conversationId: parseV3Id(data.conversationId, "Conversation"),
    text: requiredV3Text(data.text, "Message", 2000),
  }));
  const ref = db.collection("conversations").doc(input.conversationId);
  const snap = await ref.get();
  const conversation = snap.data() as V3Conversation | undefined;
  if (!snap.exists || !conversation) throw new HttpsError("not-found", "Conversation not found.");
  if (!conversation.participantUids.includes(uid)) {
    throw new HttpsError("permission-denied", "Only participants can message here.");
  }
  for (const other of conversation.participantUids.filter((id) => id !== uid)) {
    const [blockOut, blockIn] = await Promise.all([
      db.collection("users").doc(uid).collection("blocks").doc(other).get(),
      db.collection("users").doc(other).collection("blocks").doc(uid).get(),
    ]);
    if (blockOut.exists || blockIn.exists) {
      throw new HttpsError("permission-denied", "This conversation is unavailable.");
    }
  }
  await ref.collection("messages").add({
    senderUid: uid,
    text: input.text,
    sentAt: FieldValue.serverTimestamp(),
  });
  await ref.set(
    {
      lastMessageAt: FieldValue.serverTimestamp(),
      lastMessagePreview: input.text.slice(0, 140),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  return { conversationId: input.conversationId, sent: true as const };
});
