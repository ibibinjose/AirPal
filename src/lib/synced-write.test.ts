import { describe, expect, it, vi } from "vitest";
import { runRemoteWrite } from "./synced-write";

function fakeRunner() {
  const calls: { id: string; label: string; remote?: () => Promise<unknown> }[] = [];
  const runJob = vi.fn(async (opts: { id: string; label: string; remote?: () => Promise<unknown> }) => {
    calls.push(opts);
  });
  return { calls, runJob };
}

describe("runRemoteWrite", () => {
  it("queue policy hands the remote to the job runner", async () => {
    const { calls, runJob } = fakeRunner();
    const remote = vi.fn(async () => undefined);
    await runRemoteWrite({ runJob, jobId: "listing-1", label: "Listing", remote, policy: "queue" });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ id: "listing-1", label: "Listing" });
    expect(calls[0].remote).toBe(remote);
    // Queue-first never runs the remote inline.
    expect(remote).not.toHaveBeenCalled();
  });

  it("direct-then-queue runs inline and skips the queue on success", async () => {
    const { calls, runJob } = fakeRunner();
    const remote = vi.fn(async () => undefined);
    await runRemoteWrite({ runJob, jobId: "event-1", label: "Event", remote, policy: "direct-then-queue" });
    expect(remote).toHaveBeenCalledTimes(1);
    expect(calls).toHaveLength(0);
  });

  it("direct-then-queue queues a retry and rethrows on failure", async () => {
    const { calls, runJob } = fakeRunner();
    const remote = vi.fn(async () => {
      throw new Error("offline");
    });
    await expect(
      runRemoteWrite({ runJob, jobId: "event-1", label: "Event", remote, policy: "direct-then-queue" }),
    ).rejects.toThrow("offline");
    expect(calls).toHaveLength(1);
  });

  it("direct-best-effort reports to onError and never throws or queues", async () => {
    const { calls, runJob } = fakeRunner();
    const onError = vi.fn();
    const remote = vi.fn(async () => {
      throw new Error("offline");
    });
    await runRemoteWrite({
      runJob: undefined,
      jobId: "bio-1",
      label: "Bio",
      remote,
      policy: "direct-best-effort",
      onError,
    });
    expect(onError).toHaveBeenCalledTimes(1);
    expect(calls).toHaveLength(0);
    expect(runJob).not.toHaveBeenCalled();
  });

  it("tolerates a missing runner and a missing remote", async () => {
    await runRemoteWrite({ runJob: undefined, jobId: "x", label: "X", remote: undefined, policy: "queue" });
    await runRemoteWrite({
      runJob: undefined,
      jobId: "x",
      label: "X",
      remote: undefined,
      policy: "direct-best-effort",
    });
  });
});
