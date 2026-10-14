/**
 * Shared Firestore/Admin fakes for V3 callable tests. Mirrors the gate.test.ts
 * pattern: onCall returns the handler, ../admin and ../abuse are mocked, and
 * FieldValue sentinels are interpreted by the fake document writes.
 */
export const fakes = {
  isAdmin: false,
  store: new Map<string, Record<string, unknown>>(),
  audits: [] as Record<string, unknown>[],
  rateLimited: [] as string[],
  autoId: 0,
};

export function resetFakes() {
  fakes.isAdmin = false;
  fakes.store = new Map();
  fakes.audits = [];
  fakes.rateLimited = [];
  fakes.autoId = 0;
}

type Sentinel = { __op: "union" | "remove" | "delete" | "timestamp"; values?: unknown[] };

function isSentinel(value: unknown): value is Sentinel {
  return typeof value === "object" && value !== null && "__op" in (value as Record<string, unknown>);
}

function assertNoUndefined(value: unknown, path: string): void {
  if (value === undefined) {
    throw new Error(`Fake Firestore (${path}) rejects undefined like production. Strip it with v3Clean.`);
  }
  if (Array.isArray(value)) {
    for (const row of value) assertNoUndefined(row, path);
    return;
  }
  if (typeof value === "object" && value !== null && !isSentinel(value)) {
    for (const row of Object.values(value as Record<string, unknown>)) assertNoUndefined(row, path);
  }
}

function applyWrite(path: string, data: Record<string, unknown>, merge: boolean) {
  assertNoUndefined(data, path);
  const current = merge ? { ...(fakes.store.get(path) || {}) } : {};
  for (const [key, value] of Object.entries(data)) {
    if (isSentinel(value)) {
      if (value.__op === "delete") delete current[key];
      else if (value.__op === "timestamp") current[key] = `MOCK_TS_${++fakes.autoId}`;
      else if (value.__op === "union") {
        const list = Array.isArray(current[key]) ? [...(current[key] as unknown[])] : [];
        for (const item of value.values || []) {
          if (!list.includes(item)) list.push(item);
        }
        current[key] = list;
      } else if (value.__op === "remove") {
        const list = Array.isArray(current[key]) ? [...(current[key] as unknown[])] : [];
        current[key] = list.filter((item) => !(value.values || []).includes(item));
      }
    } else if (value !== undefined) {
      current[key] = value;
    }
  }
  fakes.store.set(path, current);
}

export type FakeDocSnap = {
  exists: boolean;
  id: string;
  data: () => Record<string, unknown> | undefined;
  ref: FakeDocRef;
};

export type FakeDocRef = {
  id: string;
  path: string;
  get: () => Promise<FakeDocSnap>;
  set: (data: Record<string, unknown>, opts?: { merge?: boolean }) => Promise<void>;
  delete: () => Promise<void>;
  collection: (sub: string) => FakeCollection;
};

export type FakeQuery = {
  where: (field: string, op: string, value: unknown) => FakeQuery;
  orderBy: (field: string, dir?: string) => FakeQuery;
  limit: (n: number) => FakeQuery;
  startAfter: (snap: { id: string }) => FakeQuery;
  get: () => Promise<{ docs: FakeDocSnap[]; size: number; empty: boolean }>;
};

export type FakeCollection = {
  doc: (id: string) => FakeDocRef;
  add: (data: Record<string, unknown>) => Promise<{ id: string }>;
  where: (field: string, op: string, value: unknown) => FakeQuery;
  orderBy: (field: string, dir?: string) => FakeQuery;
  limit: (n: number) => FakeQuery;
  get: () => Promise<{ docs: FakeDocSnap[]; size: number; empty: boolean }>;
};

function docRef(path: string): FakeDocRef {
  const id = path.split("/").pop() as string;
  return {
    id,
    path,
    get: async () => ({ exists: fakes.store.has(path), id, data: () => fakes.store.get(path), ref: docRef(path) }),
    set: async (data, opts) => {
      applyWrite(path, data, opts?.merge === true);
    },
    delete: async () => {
      fakes.store.delete(path);
    },
    collection: (sub: string) => collectionRef(`${path}/${sub}`),
  };
}

function runQuery(
  collPath: string,
  filters: { field: string; value: unknown }[],
  order: { field: string; dir: string } | null,
  limit: number | null,
  startAfterId: string | null,
): FakeDocSnap[] {
  const depth = collPath.split("/").length + 1;
  let docs: FakeDocSnap[] = [];
  for (const [path, data] of fakes.store.entries()) {
    const parts = path.split("/");
    if (parts.length !== depth || parts.slice(0, -1).join("/") !== collPath) continue;
    const matches = filters.every((filter) => (data as Record<string, unknown>)[filter.field] === filter.value);
    if (!matches) continue;
    const id = parts[parts.length - 1] as string;
    docs.push({ exists: true, id, data: () => data, ref: docRef(path) });
  }
  if (order) {
    docs = [...docs].sort((a, b) => {
      const left = String((a.data() || {})[order.field] ?? "");
      const right = String((b.data() || {})[order.field] ?? "");
      const cmp = left < right ? -1 : left > right ? 1 : 0;
      return order.dir === "desc" ? -cmp : cmp;
    });
  }
  if (startAfterId) {
    const at = docs.findIndex((doc) => doc.id === startAfterId);
    docs = at >= 0 ? docs.slice(at + 1) : docs;
  }
  if (limit !== null) docs = docs.slice(0, limit);
  return docs;
}

function queryRef(
  collPath: string,
  filters: { field: string; value: unknown }[] = [],
  order: { field: string; dir: string } | null = null,
  limit: number | null = null,
  startAfterId: string | null = null,
): FakeQuery {
  return {
    where: (field: string, _op: string, value: unknown) =>
      queryRef(collPath, [...filters, { field, value }], order, limit, startAfterId),
    orderBy: (field: string, dir = "asc") => queryRef(collPath, filters, { field, dir }, limit, startAfterId),
    limit: (n: number) => queryRef(collPath, filters, order, n, startAfterId),
    startAfter: (snap: { id: string }) => queryRef(collPath, filters, order, limit, snap.id),
    get: async () => {
      const docs = runQuery(collPath, filters, order, limit, startAfterId);
      return { docs, size: docs.length, empty: docs.length === 0 };
    },
  };
}

function collectionRef(collPath: string): FakeCollection {
  return {
    doc: (id: string) => docRef(`${collPath}/${id}`),
    add: async (data: Record<string, unknown>) => {
      const id = `auto-${++fakes.autoId}`;
      applyWrite(`${collPath}/${id}`, data, false);
      return { id };
    },
    where: (field: string, op: string, value: unknown) => queryRef(collPath).where(field, op, value),
    orderBy: (field: string, dir?: string) => queryRef(collPath).orderBy(field, dir),
    limit: (n: number) => queryRef(collPath).limit(n),
    get: async () => {
      const docs = runQuery(collPath, [], null, null, null);
      return { docs, size: docs.length, empty: docs.length === 0 };
    },
  };
}

export const fakeDb = {
  collection: (name: string) => collectionRef(name),
  runTransaction: async (fn: (tx: unknown) => Promise<unknown>) =>
    fn({
      get: (ref: FakeDocRef | FakeQuery) => ref.get(),
      set: (ref: FakeDocRef, data: Record<string, unknown>, opts?: { merge?: boolean }) => ref.set(data, opts),
    }),
};

export function seedDoc(path: string, data: Record<string, unknown>) {
  fakes.store.set(path, { ...data });
}

export function readDoc(path: string): Record<string, unknown> | undefined {
  return fakes.store.get(path);
}

export class FakeHttpsError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export type V3Handler = (request: unknown) => Promise<any>;

export function authedRequest(uid: string | undefined, data: unknown, anonymous = false) {
  return {
    auth: uid ? { uid, token: anonymous ? { firebase: { sign_in_provider: "anonymous" } } : {} } : {},
    data,
  };
}

export async function runV3(handler: unknown, uid: string | undefined, data: unknown, anonymous = false) {
  return (handler as V3Handler)(authedRequest(uid, data, anonymous));
}
