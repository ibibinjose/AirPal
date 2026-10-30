import { AlertTriangle, CheckCheck, CloudOff, Loader2 } from "lucide-react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { useOptionalSync } from "@/contexts/SyncContext";
import { retryableSyncJobs, syncLabel, worstSyncState } from "@/lib/sync";
import { triggerHaptic } from "@/lib/native";

export function SyncStatusPill() {
  const sync = useOptionalSync();
  if (!sync) return null;

  const worst = worstSyncState(sync.jobs);
  if (!worst || worst === "synced") return null;

  const retryable = retryableSyncJobs(sync.jobs);
  const actionable = retryable.length > 0;
  const label =
    retryable.length > 1
      ? `${syncLabel(worst, sync.powerSaveActive)} · ${retryable.length} items`
      : syncLabel(worst, sync.powerSaveActive);

  function handleRetry() {
    if (!actionable) return;
    void triggerHaptic("light");
    for (const job of retryable) sync!.retry(job.id);
  }

  const Icon =
    worst === "failed" ? AlertTriangle : worst === "syncing" ? Loader2 : worst === "local" ? CloudOff : CheckCheck;

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.25 }}
          className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+5.5rem)] left-1/2 -translate-x-1/2 z-50 w-max max-w-[calc(100vw-2rem)]"
        >
          <button
            type="button"
            onClick={handleRetry}
            disabled={!actionable}
            aria-live="polite"
            className={`flex min-h-[44px] touch-manipulation items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium shadow-xl ring-1 backdrop-blur-md ${
              worst === "failed"
                ? "cursor-pointer bg-stone-900/95 text-stone-100 ring-stone-700/80"
                : "bg-stone-900/80 text-stone-200 ring-stone-700/60"
            }`}
          >
            <Icon
              size={14}
              className={`shrink-0 ${worst === "failed" ? "text-amber-400" : "text-stone-300"} ${worst === "syncing" ? "animate-spin" : ""}`}
            />
            <span className="truncate">{label}</span>
          </button>
        </motion.div>
      </AnimatePresence>
    </MotionConfig>
  );
}
