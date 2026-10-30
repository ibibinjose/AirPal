import { describe, expect, it, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SyncStatusPill } from "./SyncStatusPill";
import { useOptionalSync } from "@/contexts/SyncContext";
import type { SyncJob } from "@/lib/sync";

vi.mock("@/contexts/SyncContext", () => ({ useOptionalSync: vi.fn() }));
vi.mock("@/lib/native", () => ({ triggerHaptic: vi.fn() }));

const mockedSync = vi.mocked(useOptionalSync);

function job(state: SyncJob["state"], id = state): SyncJob {
  return { id, label: id, state, updatedAt: new Date().toISOString(), retries: 0 };
}

function render(): string {
  return renderToStaticMarkup(createElement(SyncStatusPill));
}

beforeEach(() => {
  mockedSync.mockReset();
});

describe("SyncStatusPill", () => {
  it("renders nothing without a sync provider", () => {
    mockedSync.mockReturnValue(null);
    expect(render()).toBe("");
  });

  it("renders nothing when everything is synced", () => {
    mockedSync.mockReturnValue({
      jobs: [job("synced")],
      runJob: vi.fn() as never,
      retry: vi.fn(),
      powerSaveActive: false,
    });
    expect(render()).toBe("");
  });

  it("shows the failure label with an item count for multiple retryable jobs", () => {
    mockedSync.mockReturnValue({
      jobs: [job("failed", "a"), job("pending_retry", "b"), job("synced")],
      runJob: vi.fn() as never,
      retry: vi.fn(),
      powerSaveActive: false,
    });
    expect(render()).toMatch(/2 items/);
  });

  it("shows Saving while a write is in flight", () => {
    mockedSync.mockReturnValue({
      jobs: [job("syncing")],
      runJob: vi.fn() as never,
      retry: vi.fn(),
      powerSaveActive: false,
    });
    expect(render()).toMatch(/Saving/);
  });
});
