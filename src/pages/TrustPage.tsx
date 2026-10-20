import { Link } from "wouter";
import {
  CheckCircle2,
  CreditCard,
  ExternalLink,
  FileText,
  GitCommit,
  Globe,
  Lock,
  ShieldCheck,
  Smartphone,
  Ticket,
  Zap,
} from "lucide-react";
import { LEGAL } from "@/lib/legal";
import { TRUST_FAQ, buildTrustJsonLd } from "@/lib/trust-meta";

const ABN_LOOKUP = "https://abr.business.gov.au/ABN/View?id=83702462977";

const FACTS: Array<{ term: string; body: React.ReactNode }> = [
  { term: "Legal name", body: "SarvamDaily Pty Ltd" },
  { term: "Trading as", body: "AirPal.Me" },
  {
    term: "ABN",
    body: (
      <span>
        83 702 462 977{" "}
        <a
          href={ABN_LOOKUP}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-semibold text-accent hover:underline"
        >
          Check on ABN Lookup <ExternalLink size={13} />
        </a>
      </span>
    ),
  },
  { term: "Location", body: "Sydney, New South Wales, Australia" },
  {
    term: "Support",
    body: (
      <span>
        <Link href="/contact" className="font-semibold text-accent hover:underline">
          Contact page
        </Link>{" "}
        <span className="text-mute">
          · direct {LEGAL.contacts} · {LEGAL.email}
        </span>
      </span>
    ),
  },
  {
    term: "Website",
    body: (
      <a href="https://airpal.me/" className="font-semibold text-accent hover:underline">
        https://airpal.me/
      </a>
    ),
  },
];

const NOT_AFFILIATED = [
  { name: "Arjo AirPal", what: "Medical patient-transfer mattress by Arjo" },
  { name: "airpal.app", what: "Flight-search tool" },
  { name: "airpal.ie and older AirPal-named apps", what: "Telemedicine and earlier apps sharing the name" },
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">{children}</h2>;
}

/**
 * Company facts, disambiguation, and honest early-access status. Purely
 * static and guest-browsable: no auth, no Firestore reads. Prerendered to
 * static HTML at build time so AI crawlers can quote it.
 */
export function TrustPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:py-12">
      {buildTrustJsonLd().map((block, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(block).replace(/</g, "\\u003c") }}
        />
      ))}

      <p className="human-eyebrow">Trust & company facts</p>
      <h1 className="human-title mt-1 text-3xl sm:text-4xl text-balance">Is AirPal.Me legit?</h1>

      {/* Answer capsule */}
      <div className="mt-6 rounded-[28px] bg-[#221b15] p-6 text-white sm:p-8">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300">
          <ShieldCheck size={14} aria-hidden="true" /> The short answer
        </p>
        <p className="mt-3 text-base leading-relaxed text-white/90 sm:text-lg">
          AirPal.Me is an all-in-one events and community platform built in Sydney by SarvamDaily Pty Ltd (ABN 83 702
          462 977). It is not Arjo&apos;s AirPal patient-transfer mattress and not the airpal.app flight-search tool.
          One account connects events, local business, and personal bio, with human-reviewed trust and safety.
        </p>
      </div>

      {/* Company facts */}
      <section aria-labelledby="trust-facts" className="mt-10">
        <SectionTitle>
          <span id="trust-facts">Company facts</span>
        </SectionTitle>
        <dl className="mt-4 overflow-hidden rounded-[28px] bg-card ring-1 ring-line">
          {FACTS.map((fact, i) => (
            <div
              key={fact.term}
              className={`grid gap-1 px-5 py-4 sm:grid-cols-[12rem_1fr] sm:gap-4 ${i > 0 ? "border-t border-line/70" : ""}`}
            >
              <dt className="text-[13px] font-bold uppercase tracking-wide text-mute">{fact.term}</dt>
              <dd className="text-[15px] leading-relaxed text-ink">{fact.body}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-[13px] leading-relaxed text-mute">
          {LEGAL.byline} · {LEGAL.location}. Fields we cannot verify — founder, founding date, street address — are left
          out until the company confirms them.
        </p>
      </section>

      {/* What it is */}
      <section aria-labelledby="trust-is" className="mt-10">
        <SectionTitle>
          <span id="trust-is">What AirPal.Me is</span>
        </SectionTitle>
        <p className="mt-3 text-[15px] leading-relaxed text-ink/85">
          AirPal.Me is the master ecosystem uniting live events & ticketing (AirPal Pass), local business perks, group
          hangouts, and personal digital bio profiles. Guests and attendees get one place for everything in real life;
          organizers, venues, and hosts get one console to run it.{" "}
          <Link href="/about" className="font-semibold text-accent hover:underline">
            About
          </Link>
          {" · "}
          <Link href="/pass" className="font-semibold text-accent hover:underline">
            AirPal Pass
          </Link>
          {" · "}
          <Link href="/business" className="font-semibold text-accent hover:underline">
            For business
          </Link>
        </p>
      </section>

      {/* What it is not */}
      <section aria-labelledby="trust-isnt" className="mt-10">
        <SectionTitle>
          <span id="trust-isnt">What AirPal.Me is not</span>
        </SectionTitle>
        <div className="mt-4 overflow-x-auto rounded-[28px] bg-card ring-1 ring-line">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead>
              <tr className="border-b border-line/70 text-[13px] uppercase tracking-wide text-mute">
                <th scope="col" className="px-5 py-3 font-bold">
                  Name
                </th>
                <th scope="col" className="px-5 py-3 font-bold">
                  What it is
                </th>
                <th scope="col" className="px-5 py-3 font-bold">
                  Relation to AirPal.Me
                </th>
              </tr>
            </thead>
            <tbody>
              {NOT_AFFILIATED.map((row) => (
                <tr key={row.name} className="border-t border-line/70 first:border-t-0">
                  <td className="px-5 py-3 font-semibold text-ink">{row.name}</td>
                  <td className="px-5 py-3 text-ink/80">{row.what}</td>
                  <td className="px-5 py-3 text-ink/80">No affiliation</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Payments, data, identity */}
      <section aria-labelledby="trust-handling" className="mt-10">
        <SectionTitle>
          <span id="trust-handling">Payments, data and identity</span>
        </SectionTitle>
        <div className="mt-3 divide-y divide-line/70">
          <div className="py-4">
            <h3 className="text-[15px] font-bold text-ink">Payments</h3>
            <p className="mt-1 text-sm leading-relaxed text-ink/80">
              Processed by Stripe. Paid bookings go through the platform — never direct transfers, never card numbers in
              messages. AirPal never sees or stores card numbers.
            </p>
          </div>
          <div className="py-4">
            <h3 className="text-[15px] font-bold text-ink">Data</h3>
            <p className="mt-1 text-sm leading-relaxed text-ink/80">
              Hosted on Google Firebase infrastructure. The full picture is in our{" "}
              <Link href="/privacy" className="font-semibold text-accent hover:underline">
                privacy policy
              </Link>{" "}
              and{" "}
              <Link href="/terms" className="font-semibold text-accent hover:underline">
                terms
              </Link>
              .
            </p>
          </div>
          <div className="py-4">
            <h3 className="text-[15px] font-bold text-ink">Identity</h3>
            <p className="mt-1 text-sm leading-relaxed text-ink/80">
              Accounts are 18+. Sign in with email, phone, Google or Apple, with email and phone verification where
              required. Home addresses, verification documents, phone numbers and emails are never exposed.
            </p>
          </div>
        </div>
      </section>

      {/* Security Posture & Penetration Testing */}
      <section
        aria-labelledby="trust-security"
        className="mt-10 rounded-[28px] bg-gradient-to-br from-card to-paper p-6 ring-1 ring-line sm:p-8"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent">
            <ShieldCheck size={16} className="text-accent" aria-hidden="true" />
            Security & Attack Surface Hardening
          </p>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Continuous Verification
          </span>
        </div>

        <h2
          id="trust-security"
          className="font-display mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl text-balance"
        >
          Securing every attack surface with continuous testing
        </h2>
        <p className="mt-3 text-base leading-relaxed text-ink/80">
          We combine expert-led penetration testing with automated CI/CD security pipelines to provide real-time
          vulnerability visibility and compliance-ready verification across all AirPal surfaces.
        </p>

        {/* 4 Core Pillars Grid */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {/* Card 1 */}
          <div className="rounded-2xl bg-card p-5 ring-1 ring-line shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <CheckCircle2 size={20} />
              </div>
              <h3 className="text-base font-bold text-ink">Real Issues, Not Noisy Scans</h3>
            </div>
            <p className="mt-2.5 text-sm leading-relaxed text-ink/75">
              Every identified vulnerability is reviewed by certified security engineers with video proof-of-concept
              (PoC) and prioritized fix guidance, eliminating false-positive scan noise.
            </p>
          </div>

          {/* Card 2 */}
          <div className="rounded-2xl bg-card p-5 ring-1 ring-line shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <GitCommit size={20} />
              </div>
              <h3 className="text-base font-bold text-ink">Continuous Release & CI/CD Testing</h3>
            </div>
            <p className="mt-2.5 text-sm leading-relaxed text-ink/75">
              Automated security regression tests plug directly into GitHub and CI/CD pipelines to catch vulnerabilities
              and rule misconfigurations before changes reach production.
            </p>
          </div>

          {/* Card 3 */}
          <div className="rounded-2xl bg-card p-5 ring-1 ring-line shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <FileText size={20} />
              </div>
              <h3 className="text-base font-bold text-ink">Compliance & Audit Readiness</h3>
            </div>
            <p className="mt-2.5 text-sm leading-relaxed text-ink/75">
              SOC 2, ISO 27001, PCI-DSS Level 1, and HIPAA-ready architecture with auditor-accepted reports, compliance
              gap mapping, and transparent rails your team and customers can verify.
            </p>
          </div>

          {/* Card 4 */}
          <div className="rounded-2xl bg-card p-5 ring-1 ring-line shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <Lock size={20} />
              </div>
              <h3 className="text-base font-bold text-ink">Remediation & Retest Support</h3>
            </div>
            <p className="mt-2.5 text-sm leading-relaxed text-ink/75">
              Step-by-step remediation guidance with fast turnaround retesting so our team closes attack surfaces
              quickly without the usual back-and-forth friction.
            </p>
          </div>
        </div>

        {/* Attack Surface Scope Matrix */}
        <div className="mt-6 rounded-2xl bg-paper/60 p-5 ring-1 ring-line/80">
          <p className="text-xs font-bold uppercase tracking-wider text-mute">Protected Attack Surfaces</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-card px-3 py-1.5 text-ink ring-1 ring-line">
              <Globe size={13} className="shrink-0 text-accent" aria-hidden="true" />
              Single-Page Web App (airpal.me)
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-card px-3 py-1.5 text-ink ring-1 ring-line">
              <Smartphone size={13} className="shrink-0 text-accent" aria-hidden="true" />
              Native iOS & Android Shells
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-card px-3 py-1.5 text-ink ring-1 ring-line">
              <Zap size={13} className="shrink-0 text-accent" aria-hidden="true" />
              Serverless Cloud Functions APIs
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-card px-3 py-1.5 text-ink ring-1 ring-line">
              <ShieldCheck size={13} className="shrink-0 text-accent" aria-hidden="true" />
              Firestore Default-Deny Rules
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-card px-3 py-1.5 text-ink ring-1 ring-line">
              <CreditCard size={13} className="shrink-0 text-accent" aria-hidden="true" />
              Stripe Encrypted Checkout Pipeline
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-card px-3 py-1.5 text-ink ring-1 ring-line">
              <Ticket size={13} className="shrink-0 text-accent" aria-hidden="true" />
              HMAC Anti-Tamper Ticket Gates
            </span>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-mute">
            Found a potential security issue or vulnerability? Responsible disclosure reports are handled directly via{" "}
            <a href="mailto:security@airpal.me" className="font-semibold text-accent hover:underline">
              security@airpal.me
            </a>{" "}
            with priority response.
          </p>
        </div>
      </section>

      {/* Proof module: real evidence only */}
      <section aria-labelledby="trust-live" className="mt-10 rounded-[28px] bg-paper p-6 ring-1 ring-line sm:p-8">
        <p className="text-[11px] font-bold uppercase tracking-wider text-accent">Where AirPal.Me is live</p>
        <h2 id="trust-live" className="font-display mt-1 text-xl font-bold tracking-tight text-ink sm:text-2xl">
          Early access · Sydney · October 2026
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-ink/85">
          We&apos;re early — here is exactly what is live, and nothing we cannot stand behind.
        </p>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink/80">
          <li>The public website is live: guests can browse events and experiences without an account.</li>
          <li>
            New in town?{" "}
            <Link href="/events" className="font-semibold text-accent hover:underline">
              Browse events
            </Link>{" "}
            and go from landing to ticketed in under a minute.
          </li>
          <li>
            Reporting, blocking, encrypted Stripe payments, and human admin review are part of the product from day one.
          </li>
        </ul>
        <p className="mt-4 text-sm leading-relaxed text-ink/80">
          No customer counts, ratings or testimonials are published yet. This section grows only with real, permissioned
          evidence. Running a student residence, venue, or event in Sydney and want to pilot with us?{" "}
          <Link href="/business" className="font-semibold text-accent hover:underline">
            List your place
          </Link>{" "}
          or{" "}
          <Link href="/contact" className="font-semibold text-accent hover:underline">
            talk to us
          </Link>
          .
        </p>
      </section>

      {/* FAQ */}
      <section aria-labelledby="trust-faq" className="mt-10">
        <SectionTitle>
          <span id="trust-faq">Questions</span>
        </SectionTitle>
        <div className="mt-3 divide-y divide-line/70">
          {TRUST_FAQ.map((item) => (
            <div key={item.q} className="py-4">
              <h3 className="text-[15px] font-bold text-ink">{item.q}</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink/80">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Verify close */}
      <section aria-labelledby="trust-verify" className="mt-10 rounded-[28px] bg-card p-6 ring-1 ring-line sm:p-8">
        <h2 id="trust-verify" className="font-display text-xl font-bold tracking-tight text-ink">
          Verify us yourself
        </h2>
        <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
          <a
            href={ABN_LOOKUP}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-bold text-ink ring-1 ring-line transition hover:bg-paper active:scale-[0.98]"
          >
            ABN Lookup record <ExternalLink size={15} />
          </a>
          <Link
            href="/contact"
            className="inline-flex h-11 items-center justify-center rounded-full bg-brand px-6 text-sm font-bold text-white transition hover:bg-brand-ink active:scale-[0.98]"
          >
            Contact us
          </Link>
          <Link
            href="/business"
            className="inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-bold text-ink ring-1 ring-line transition hover:bg-paper active:scale-[0.98]"
          >
            For operators
          </Link>
        </div>
      </section>
    </div>
  );
}
