import type { ReactNode } from "react";
import { ArrowLeft, Mail, Scale, ShieldCheck } from "lucide-react";
import { Link, useLocation } from "wouter";
import { LEGAL } from "@/lib/legal";

const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms & Conditions" },
  { href: "/cookies", label: "Cookie Policy" },
  { href: "/trust", label: "Trust & Safety" },
  { href: "/help", label: "Help Center" },
  { href: "/contact", label: "Contact" },
];

export function LegalDoc({
  kicker,
  title,
  lede,
  children,
}: {
  kicker: string;
  title: string;
  lede?: string;
  children: ReactNode;
}) {
  const [location] = useLocation();

  return (
    <div className="pb-[max(6.5rem,calc(env(safe-area-inset-bottom,0px)+5.5rem))]">
      <article className="mx-auto max-w-2xl px-4 pb-6 pt-6 md:px-6">
        {/* Top Navigation & Policy Switcher */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
          <Link
            href="/settings"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-4 text-xs font-bold text-ink ring-1 ring-line transition hover:bg-paper active:scale-95"
          >
            <ArrowLeft size={15} />
            <span>Settings</span>
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-[11px] font-bold text-accent">
            <Scale size={12} />
            <span>Zero Ad-Tracker Guarantee</span>
          </span>
        </div>

        <nav aria-label="Legal documents" className="mb-6 flex flex-wrap gap-1.5">
          {LEGAL_LINKS.map((item) => {
            const active = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-[38px] items-center rounded-full px-3.5 text-xs font-semibold transition ${
                  active ? "bg-brand text-white shadow-2xs" : "bg-card text-ink ring-1 ring-line hover:bg-paper"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="rounded-3xl bg-card p-5 sm:p-7 ring-1 ring-line shadow-xs">
          <p className="human-eyebrow">{kicker}</p>
          <h1 className="human-title mt-1 text-3xl md:text-4xl text-balance">{title}</h1>
          <p className="mt-2 text-xs sm:text-sm text-mute tabular-data">
            Effective {LEGAL.updated} · {LEGAL.location} · {LEGAL.operator} (ABN {LEGAL.abn})
          </p>
          {lede && <p className="human-lede mt-4 text-sm sm:text-base">{lede}</p>}
        </div>

        <div className="legal-prose mt-8">{children}</div>

        <div className="mt-12 rounded-3xl bg-card p-5 sm:p-6 ring-1 ring-line shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="flex items-center gap-1.5 text-sm font-bold text-ink">
              <ShieldCheck size={16} className="text-accent" />
              <span>Questions about your data or rights?</span>
            </p>
            <p className="mt-1 text-xs text-mute">
              Write to{" "}
              <a href={`mailto:${LEGAL.email}`} className="font-semibold text-accent hover:underline">
                {LEGAL.email}
              </a>{" "}
              or use our direct support form.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Link
              href="/contact"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-brand px-4 text-xs font-bold text-white shadow-xs hover:bg-brand-ink transition"
            >
              <Mail size={14} />
              <span>Contact us</span>
            </Link>
            <Link
              href="/settings"
              className="inline-flex min-h-[44px] items-center rounded-full bg-paper px-4 text-xs font-semibold text-ink ring-1 ring-line hover:bg-card transition"
            >
              Back to Settings
            </Link>
          </div>
        </div>
      </article>
    </div>
  );
}
