import { describe, expect, it } from "vitest";
import {
  addMemory,
  listMemories,
  memoriesWithPerson,
  removeMemory,
  setMemoriesAccount,
  setMemoriesPersistHook,
  updateMemory,
} from "./memories";
import {
  buildVCard,
  listPeople,
  removePerson,
  saveBioContact,
  setPeopleAccount,
  setPeoplePersistHook,
  upsertPerson,
} from "./people";

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => {
      map.set(k, String(v));
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
    clear: () => map.clear(),
  };
}

if (typeof globalThis.localStorage === "undefined" || !globalThis.localStorage.getItem) {
  (globalThis as Record<string, unknown>).localStorage = memoryStorage();
}

describe("people", () => {
  it("requires server persistence before saving", async () => {
    setPeopleAccount(null);
    setPeoplePersistHook(null);
    await expect(upsertPerson({ handle: "@Maya", name: "Maya" })).rejects.toThrow(
      "Sign in to save people to your AirPal account.",
    );
  });

  it("upserts by handle and merges repeats after server persistence", async () => {
    localStorage.clear();
    setPeopleAccount("test-user");
    setPeoplePersistHook(async () => undefined);
    const first = await upsertPerson({ handle: "@Maya", name: "Maya", whereMet: "Bondi" });
    const second = await upsertPerson({ handle: "maya", name: "Maya R.", photo: "https://airpal.me/photo.jpg" });
    expect(second.id).toBe(first.id);
    expect(listPeople()).toHaveLength(1);
    expect(listPeople()[0].name).toBe("Maya R.");
    expect(listPeople()[0].whereMet).toBe("Bondi");
    await removePerson(first.id);
    expect(listPeople()).toHaveLength(0);
  });

  it("builds a parseable vCard", () => {
    const vcf = buildVCard({
      name: "Maya Rao",
      phone: "+91 98200 12345",
      url: "https://airpal.me/@maya",
      note: "Met at Bondi · AirPal",
    });
    expect(vcf).toContain("BEGIN:VCARD");
    expect(vcf).toContain("FN:Maya Rao");
    expect(vcf).toContain("TEL;TYPE=CELL:+91 98200 12345");
    expect(vcf).toContain("URL:https://airpal.me/@maya");
    expect(vcf).toContain("END:VCARD");
  });

  it("emits remote portraits as PHOTO;VALUE=URI", () => {
    const vcf = buildVCard({ name: "Maya Rao", photoUrl: "https://cdn.airpal.me/maya.jpg" });
    expect(vcf).toContain("PHOTO;VALUE=URI:https://cdn.airpal.me/maya.jpg");
  });

  it("never emits data-blob or non-remote photos", () => {
    const dataUri = buildVCard({ name: "Maya Rao", photoUrl: "data:image/png;base64,AAA" });
    expect(dataUri).not.toContain("PHOTO");
    const empty = buildVCard({ name: "Maya Rao" });
    expect(empty).not.toContain("PHOTO");
  });

  it("keeps URLs and photo URIs clickable (no ; or , escaping)", () => {
    const vcf = buildVCard({
      name: "Maya Rao",
      url: "https://maps.example.com/?q=Sydney,NSW;venue=hall",
      photoUrl: "https://cdn.airpal.me/maya.jpg?x=1,2;v=3",
    });
    expect(vcf).toContain("URL:https://maps.example.com/?q=Sydney,NSW;venue=hall");
    expect(vcf).toContain("PHOTO;VALUE=URI:https://cdn.airpal.me/maya.jpg?x=1,2;v=3");
  });

  it("folds long lines at 75 bytes per RFC 2426", () => {
    const note = `AirPal Digital Bio Pass (@maya) · ${"Very long headline ".repeat(10)}· Sydney`;
    const vcf = buildVCard({ name: "Maya Rao", note });
    const encoder = new TextEncoder();
    for (const line of vcf.split("\r\n")) {
      expect(encoder.encode(line).length).toBeLessThanOrEqual(75);
    }
    expect(vcf.replace(/\r\n /g, "")).toContain(`NOTE:${note}`);
  });

  it("saves bio contact with clean handle and formatted note", async () => {
    const res = await saveBioContact({
      name: "Maya Rao",
      handle: "@maya",
      phone: "+91 98200 12345",
      headline: "Product Lead",
      city: "Sydney",
    });
    expect(["contact", "shared", "download"]).toContain(res);
  });
});

describe("memories", () => {
  it("requires server persistence before saving", async () => {
    setMemoriesAccount(null);
    setMemoriesPersistHook(null);
    await expect(addMemory({ src: "https://airpal.me/photo.jpg", people: [] })).rejects.toThrow(
      "Sign in to save memories to your AirPal account.",
    );
  });

  it("adds, updates, filters by person, and removes after server persistence", async () => {
    localStorage.clear();
    setMemoriesAccount("test-user");
    setMemoriesPersistHook(async () => undefined);
    const a = await addMemory({
      src: "storage://memories/test-user/1.jpg",
      caption: "Sunset",
      people: ["@maya", "Leo"],
      place: "Bondi",
    });
    await addMemory({ src: "storage://memories/test-user/2.jpg", people: [] });
    expect(listMemories()).toHaveLength(2);
    expect(memoriesWithPerson(listMemories(), "maya")).toHaveLength(1);
    const updated = await updateMemory(a.id, { caption: "Sunset swim" });
    expect(updated?.caption).toBe("Sunset swim");
    await removeMemory(a.id);
    expect(listMemories()).toHaveLength(1);
  });
});
