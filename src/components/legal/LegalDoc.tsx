import type { ReactNode } from "react";
import { Link } from "wouter";
import { LEGAL } from "@/lib/legal";

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
  return (
    <div>
      <article className="mx-auto max-w-2xl px-4 pb-6 pt-8 md:px-6">
        <p className="human-eyebrow">{kicker}</p>
        <h1 className="human-title mt-1 text-3xl md:text-4xl text-balance">{title}</h1>
        <p className="mt-2 text-sm text-mute tabular-data">
          Effective {LEGAL.updated} · {LEGAL.location}
        </p>
        {lede && <p className="human-lede mt-5 text-sm sm:text-base">{lede}</p>}
        <div className="legal-prose mt-8">{children}</div>
        <p className="mt-12 text-sm text-mute">
          Questions?{" "}
          <Link href="/contact" className="text-accent">
            Contact us
          </Link>{" "}
          or write to{" "}
          <a href={`mailto:${LEGAL.email}`} className="text-accent">
            {LEGAL.email}
          </a>
          .
        </p>
      </article>
    </div>
  );
}
