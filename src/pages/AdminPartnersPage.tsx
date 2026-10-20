import { Link } from "wouter";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PageLoading } from "@/components/ui/PageLoading";
import { useAuth } from "@/contexts/AuthContext";
import { PartnerApplicationsAdmin } from "@/components/admin/PartnerApplicationsAdmin";

/** Dedicated admin review queue for Pass partner applications. Admin-gated. */
export function AdminPartnersPage() {
  const { isAdmin, authReady, user } = useAuth();

  if (!authReady) return <PageLoading message="Authenticating platform admin…" />;

  if (!user || !isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-red-500/10 ring-1 ring-red-500/20">
          <ShieldCheck className="h-7 w-7 text-red-500" />
        </div>
        <p className="font-display mt-4 text-2xl font-bold">Admin Restricted</p>
        <p className="mt-2 text-sm text-mute leading-relaxed">
          Sign in with an authorized platform administrator account to review partner applications.
        </p>
        <Button className="mt-6 w-full min-h-[44px]" onClick={() => window.location.assign("/start")}>
          Sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8 pb-[calc(env(safe-area-inset,0px)+6.5rem)]">
      <Link
        href="/admin"
        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-3.5 text-xs font-semibold text-ink ring-1 ring-line hover:bg-paper transition whitespace-nowrap"
      >
        <ArrowLeft size={14} className="shrink-0" />
        <span>Admin command center</span>
      </Link>
      <PartnerApplicationsAdmin />
    </div>
  );
}
