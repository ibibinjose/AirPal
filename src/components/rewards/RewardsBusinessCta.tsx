import { Link } from "wouter";
import { Store, ArrowRight } from "lucide-react";

export function RewardsBusinessCta() {
  return (
    <Link
      href="/business"
      className="flex w-full items-center justify-between gap-3 rounded-3xl bg-neutral-900 p-5 text-left text-white shadow-md hover:bg-black transition active:scale-[0.99]"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/10 text-amber-400">
          <Store size={18} aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-amber-400">For business</p>
          <p className="mt-0.5 text-sm font-semibold leading-snug">
            Fund rewards for your customers. Free to join, verified at the till, no extra hardware.
          </p>
        </div>
      </div>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-white">
        <ArrowRight size={16} aria-hidden="true" />
      </span>
    </Link>
  );
}
