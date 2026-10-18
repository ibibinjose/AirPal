import { AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

/** Confirm removing a venue profile from the partner account. */
export function DeleteVenueDialog({
  venueName,
  deleting,
  onCancel,
  onConfirm,
}: {
  venueName: string;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-card p-6 ring-1 ring-line shadow-2xl">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-500 ring-1 ring-red-500/20">
          <AlertTriangle className="h-6 w-6" aria-hidden />
        </div>
        <h3 className="font-display mt-4 text-xl font-bold text-ink">Remove &ldquo;{venueName}&rdquo;?</h3>
        <p className="mt-2 text-xs text-mute leading-relaxed">
          This will unbind and remove this venue profile from your active partner account. If you imported or tested
          Shangri-La Sydney or another location by mistake, removing it lets you start fresh or register your own venue.
        </p>

        <div className="mt-6 flex items-center justify-end gap-3">
          <Button variant="ghost" disabled={deleting} onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={deleting} loading={deleting} onClick={onConfirm}>
            <Trash2 className="h-4 w-4" aria-hidden />
            Confirm Removal
          </Button>
        </div>
      </div>
    </div>
  );
}
