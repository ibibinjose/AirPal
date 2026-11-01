import { useEffect, useState, type FormEvent } from "react";
import { Link } from "wouter";
import { ArrowLeft, Check, Copy, LifeBuoy, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { LEGAL } from "@/lib/legal";
import { triggerHaptic } from "@/lib/native";
import { fieldInput, fieldTextarea } from "@/components/forms/ValidField";

const TOPICS = [
  { id: "general", label: "General" },
  { id: "safety", label: "Safety & Reports" },
  { id: "ticketing", label: "Tickets & Passes" },
  { id: "host", label: "Event / Venue Host" },
  { id: "business", label: "Local Business / Merchant" },
  { id: "handle", label: "Handle / Trade Mark" },
  { id: "access", label: "Copy of My Data" },
  { id: "delete", label: "Delete My Data" },
  { id: "legal", label: "Legal & Compliance" },
] as const;

export function ContactPage() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState<(typeof TOPICS)[number]["id"]>("general");
  const [message, setMessage] = useState("");
  const [copiedEmail, setCopiedEmail] = useState(false);

  useEffect(() => {
    if (user?.displayName && !name) {
      setName(user.displayName);
    }
    if (user?.email && !email) {
      setEmail(user.email);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.displayName, user?.email]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void triggerHaptic("medium");
    const subject = `[AirPal.Me] ${TOPICS.find((t) => t.id === topic)?.label} — ${name || "Message"}`;
    const body = [`Name: ${name}`, `Email: ${email}`, `Topic: ${topic}`, "", message].join("\n");
    const href = `mailto:${LEGAL.contacts}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = href;
    void navigator.clipboard?.writeText(`${subject}\n\n${body}`).then(
      () => toast.success("Copied. Your mail app should open."),
      () => toast.message("Open your mail app to send."),
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 pb-[max(6.5rem,calc(env(safe-area-inset-bottom,0px)+5.5rem))] pt-6 md:px-6">
      {/* Top Bar Navigation */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/settings"
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-4 text-xs font-bold text-ink ring-1 ring-line transition hover:bg-paper active:scale-95"
        >
          <ArrowLeft size={15} />
          <span>Settings</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/help"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-3.5 text-xs font-semibold text-ink ring-1 ring-line transition hover:bg-paper"
          >
            <LifeBuoy size={14} className="text-accent" />
            <span>Help Center</span>
          </Link>
          <Link
            href="/bio/recover"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-3.5 text-xs font-semibold text-ink ring-1 ring-line transition hover:bg-paper"
          >
            <ShieldCheck size={14} className="text-accent" />
            <span>Recover @handle</span>
          </Link>
        </div>
      </div>

      <div className="rounded-3xl bg-card p-5 sm:p-7 ring-1 ring-line shadow-clay">
        <p className="human-eyebrow">Contact &amp; Support</p>
        <h1 className="human-title mt-1 text-3xl text-balance">Write to us</h1>
        <p className="mt-3 text-sm sm:text-[15px] leading-relaxed text-ink/80">
          For data access or account deletion, choose that topic below. To recover an @handle that matches your
          registered name, trade mark, or domain, choose <strong>Handle / Trade Mark</strong> or visit{" "}
          <Link href="/bio/recover" className="font-semibold text-accent hover:underline">
            handle recovery
          </Link>
          . A human reads every message.
        </p>

        {/* Direct Email Strip */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-paper px-4 py-3 ring-1 ring-line">
          <div className="flex items-center gap-2 text-xs sm:text-sm min-w-0">
            <Mail size={15} className="text-accent shrink-0" />
            <span className="text-mute">Direct:</span>
            <a href={`mailto:${LEGAL.contacts}`} className="font-semibold text-accent hover:underline truncate">
              {LEGAL.contacts}
            </a>
            <span className="text-mute">·</span>
            <a href={`mailto:${LEGAL.email}`} className="font-semibold text-accent hover:underline truncate">
              {LEGAL.email}
            </a>
          </div>
          <button
            type="button"
            onClick={() => {
              void triggerHaptic("light");
              void navigator.clipboard?.writeText(LEGAL.contacts).then(() => {
                setCopiedEmail(true);
                toast.success(`Copied ${LEGAL.contacts}`);
                setTimeout(() => setCopiedEmail(false), 2000);
              });
            }}
            className="inline-flex min-h-[36px] items-center gap-1 rounded-full bg-card px-3 text-xs font-bold text-ink ring-1 ring-line hover:bg-paper cursor-pointer"
          >
            {copiedEmail ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
            <span>{copiedEmail ? "Copied" : "Copy email"}</span>
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="contact-name" className="block text-xs font-bold uppercase tracking-wider text-mute mb-1">
                Your Name
              </label>
              <input
                id="contact-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-label="Name"
                autoComplete="name"
                placeholder="Name"
                required
                className={fieldInput}
              />
            </div>
            <div>
              <label
                htmlFor="contact-email"
                className="block text-xs font-bold uppercase tracking-wider text-mute mb-1"
              >
                Your Email
              </label>
              <input
                id="contact-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-label="Email"
                placeholder="Email"
                required
                className={fieldInput}
              />
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-mute mb-2">Topic</p>
            <div className="flex flex-wrap gap-2">
              {TOPICS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={topic === t.id}
                  onClick={() => {
                    void triggerHaptic("light");
                    setTopic(t.id);
                  }}
                  className={`inline-flex min-h-[44px] items-center rounded-full px-3.5 text-xs font-semibold transition active:scale-95 cursor-pointer ${
                    topic === t.id
                      ? "bg-brand text-white shadow-xs"
                      : "bg-paper text-ink ring-1 ring-line hover:bg-card"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="contact-message"
              className="block text-xs font-bold uppercase tracking-wider text-mute mb-1"
            >
              Message
            </label>
            <textarea
              id="contact-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              aria-label="Message"
              placeholder="How can we help?"
              required
              className={`h-36 ${fieldTextarea}`}
            />
          </div>

          <Button type="submit" size="lg" className="min-h-[48px] w-full rounded-full font-bold">
            Open email &amp; copy message
          </Button>
        </form>

        <p className="mt-4 text-xs text-mute">
          We never use this form for marketing. See our{" "}
          <Link href="/privacy" className="font-semibold text-accent hover:underline">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link href="/trust" className="font-semibold text-accent hover:underline">
            Trust &amp; Safety
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
