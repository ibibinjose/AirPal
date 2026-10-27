import { describe, expect, it, vi } from "vitest";
import { recordAnalyticsBatch, writeAuthoritativeEvent } from "./analytics";

const { fakes } = vi.hoisted(() => ({
  fakes: {
    docs: {} as Record<string, Record<string, unknown>>,
  },
}));

function hasUndefined(value: unknown): boolean {
  if (value === undefined) return true;
  if (Array.isArray(value)) return value.some(hasUndefined);
  if (value && typeof value === "object") return Object.values(value as Record<string, unknown>).some(hasUndefined);
  return false;
}

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: { serverTimestamp: () => ({ __sentinel: "serverTimestamp" }) },
  getFirestore: () => ({
    collection: (name: string) => ({
      doc: (id: string) => ({
        get: async () => {
          const data = fakes.docs[`${name}/${id}`];
          return { exists: Boolean(data), data: () => data };
        },
        set: async (data: Record<string, unknown>) => {
          // Firestore rejects undefined field values with an INTERNAL 500
          // from callables — the regression this guards against.
          if (hasUndefined(data)) throw new Error("Cannot use undefined as a Firestore value");
          fakes.docs[`${name}/${id}`] = data;
        },
      }),
      where: () => ({ limit: () => ({ get: async () => ({ empty: true, docs: [] }) }) }),
    }),
    batch: () => ({ set: () => undefined, commit: async () => undefined }),
  }),
}));

vi.mock("./admin", () => ({
  CALLABLE: {},
  requireAccount: (request: { auth?: { uid?: string } }) => {
    const uid = request.auth?.uid;
    if (!uid) throw new Error("unauthenticated");
    return uid;
  },
  isPlatformAdmin: () => false,
  auth: {},
  db: {},
}));

vi.mock("./abuse", () => ({
  noteAppCheck: async () => undefined,
  enforceRateLimit: async () => undefined,
  isAnonymousAuth: () => false,
}));

vi.mock("firebase-functions/v2/https", () => ({
  HttpsError: class HttpsError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  },
  onCall: (_opts: unknown, handler: unknown) => handler,
  onSchedule: (_opts: unknown, handler: unknown) => handler,
}));

type Handler = (request: unknown) => Promise<Record<string, unknown>>;

function run(handler: unknown, uid: string | undefined, data: unknown) {
  return (handler as unknown as Handler)({ auth: uid ? { uid, token: {} } : {}, data });
}

const SESSION_EVENT = {
  eventId: "evt-session-1",
  eventName: "session_started",
  anonymousSessionId: "anon-1",
  occurredAt: new Date().toISOString(),
  backendState: "live",
  properties: { entryPath: "/", source: "internal" },
};

describe("analytics writes without undefined fields", () => {
  it("recordAnalyticsBatch accepts an event with missing optional fields", async () => {
    const res = await run(recordAnalyticsBatch, "u123", { events: [SESSION_EVENT] });
    expect(res.accepted).toBe(1);
    expect(res.rejected).toBe(0);
    const stored = fakes.docs["analyticsEvents/evt-session-1"];
    expect(stored).toBeDefined();
    expect(hasUndefined(stored)).toBe(false);
  });

  it("writeAuthoritativeEvent stores no undefined fields", async () => {
    await writeAuthoritativeEvent({
      uid: "u123",
      eventName: "host_activation",
      properties: { tenantId: "u123", activationStep: "listing_created", contextId: "list-1", actorRole: "host_admin" },
    });
    const stored = Object.values(fakes.docs).find(
      (doc) => (doc.properties as Record<string, unknown>)?.activationStep === "listing_created",
    );
    expect(stored).toBeDefined();
    expect(hasUndefined(stored)).toBe(false);
  });
});
