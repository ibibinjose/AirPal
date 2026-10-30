/**
 * One shared shape for every "write local first, sync to server" path.
 *
 * The three domain contexts used to hand-roll this three different ways:
 * - "queue" (listings): hand the remote to the sync job runner, which syncs
 *   now or retries in the background. Remote failures never throw.
 * - "direct-then-queue" (events): try the remote inline so success is
 *   immediate; on failure queue a retry AND rethrow so the caller knows.
 * - "direct-best-effort" (bio): try the remote inline; on failure run onError
 *   (log it) and carry on. Bio intentionally does not queue — the next save
 *   retries (callers pass runJob: undefined).
 *
 * Local persistence (cache writes, UI refresh, analytics) stays in the
 * calling context — this helper only unifies the remote half.
 */

export type RemoteWritePolicy = "queue" | "direct-then-queue" | "direct-best-effort";

export interface RemoteWriteRequest {
  runJob: ((opts: { id: string; label: string; remote?: () => Promise<unknown> }) => Promise<void>) | null | undefined;
  jobId: string;
  label: string;
  remote: (() => Promise<unknown>) | undefined;
  policy: RemoteWritePolicy;
  onError?: (err: unknown) => void | Promise<void>;
}

export async function runRemoteWrite(request: RemoteWriteRequest): Promise<void> {
  const { runJob, jobId, label, remote, policy, onError } = request;
  if (policy === "queue" || !remote) {
    await runJob?.({ id: jobId, label, remote });
    return;
  }
  try {
    await remote();
  } catch (err) {
    if (policy === "direct-then-queue") {
      await runJob?.({ id: jobId, label, remote });
    }
    if (onError) await onError(err);
    else if (policy === "direct-then-queue") throw err;
  }
}
