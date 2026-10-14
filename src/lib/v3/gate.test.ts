import { describe, expect, it, vi, afterEach } from "vitest";
import { isV3AdaptersEnabled, requireV3Adapters } from "./gate";

describe("V3 local-only gate", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("stays off unless both the flag and the emulator are set", () => {
    vi.stubEnv("VITE_V3_ADAPTERS", "");
    vi.stubEnv("VITE_USE_FIREBASE_EMULATOR", "");
    expect(isV3AdaptersEnabled()).toBe(false);
    vi.stubEnv("VITE_V3_ADAPTERS", "true");
    vi.stubEnv("VITE_USE_FIREBASE_EMULATOR", "");
    expect(isV3AdaptersEnabled()).toBe(false);
    vi.stubEnv("VITE_V3_ADAPTERS", "");
    vi.stubEnv("VITE_USE_FIREBASE_EMULATOR", "true");
    expect(isV3AdaptersEnabled()).toBe(false);
    vi.stubEnv("VITE_V3_ADAPTERS", "true");
    vi.stubEnv("VITE_USE_FIREBASE_EMULATOR", "true");
    expect(isV3AdaptersEnabled()).toBe(true);
  });

  it("refuses adapter use while disabled", () => {
    vi.stubEnv("VITE_V3_ADAPTERS", "");
    vi.stubEnv("VITE_USE_FIREBASE_EMULATOR", "");
    expect(() => requireV3Adapters()).toThrow("V3 adapters are disabled");
  });
});
