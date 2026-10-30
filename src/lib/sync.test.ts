import { describe, expect, it } from "vitest";
import { nextRetryDelayMs, retryableSyncJobs, syncLabel, worstSyncState, type SyncJob } from "./sync";

function job(state: SyncJob["state"]): SyncJob {
  return { id: state, label: state, state, updatedAt: new Date().toISOString(), retries: 0 };
}

describe("sync status", () => {
  it("explains each state in plain language", () => {
    expect(syncLabel("local")).toMatch(/device/i);
    expect(syncLabel("syncing")).toMatch(/Saving/);
    expect(syncLabel("synced")).toBe("Synced");
    expect(syncLabel("failed")).toMatch(/retry/i);
    expect(syncLabel("pending_retry")).toMatch(/retry/i);
    expect(syncLabel("pending_retry", true)).toMatch(/Power Saver/i);
  });

  it("surfaces failures over in-flight and local saves", () => {
    expect(worstSyncState([job("synced"), job("local"), job("failed")])?.valueOf()).toBe("failed");
    expect(worstSyncState([job("synced"), job("syncing")])).toBe("syncing");
    expect(worstSyncState([])).toBeNull();
  });

  it("collects only failed and pending-retry jobs for retry", () => {
    const jobs = [job("synced"), job("failed"), job("syncing"), job("pending_retry"), job("local")];
    expect(retryableSyncJobs(jobs).map((j) => j.state)).toEqual(["failed", "pending_retry"]);
    expect(retryableSyncJobs([])).toEqual([]);
  });

  it("backs off retries", () => {
    expect(nextRetryDelayMs(0)).toBe(1500);
    expect(nextRetryDelayMs(4)).toBe(24000);
    expect(nextRetryDelayMs(10)).toBe(30000);
  });

  it("throttles retries when powerSave mode is active", () => {
    expect(nextRetryDelayMs(0, true)).toBe(6000);
    expect(nextRetryDelayMs(1, true)).toBe(12000);
    expect(nextRetryDelayMs(4, true)).toBe(96000);
    expect(nextRetryDelayMs(10, true)).toBe(120000);
  });
});
