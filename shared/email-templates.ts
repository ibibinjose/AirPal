/**
 * AirPal Master Brand Email Templates
 *
 * Implements the unified "Life Made Easy" brand flow across both lenses:
 * 1. AirPal Pass (Events, Live Concerts, Indian Festivals, Wallet Passbook)
 * 2. AirPal.Me (Personal Identity, Digital Bio, Circle Networking, Catch-ups)
 *
 * Responsive, bulletproof table layouts compatible with Apple Mail, Gmail,
 * Outlook, and mobile email clients, with automatic dark/light contrast rails.
 */

export interface EmailRenderOutput {
  subject: string;
  preheader: string;
  html: string;
  text: string;
}

export const EMAIL_BRAND = {
  site: "https://airpal.me",
  from: "AirPal <noreply@email.airpal.me>",
  brandBlue: "#004eff",
  brandBlueHover: "#003dcb",
  gold: "#ffb224",
  darkBg: "#0e0f0c",
  darkCard: "#161814",
  darkBorder: "#2b2f23",
  darkInk: "#f4f2e9",
  darkMute: "#a3a698",
  lightBg: "#faf8f5",
  lightCard: "#ffffff",
  lightBorder: "#e5e7eb",
  lightInk: "#111827",
  lightMute: "#6b7280",
} as const;

function escapeHtml(raw: string): string {
  return String(raw || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function greetingFirstName(name?: string): string {
  const trimmed = (name || "").trim();
  if (!trimmed || trimmed.includes("@")) return "";
  return trimmed.split(/\s+/)[0] || "";
}

export interface WrapBrandEmailOptions {
  title: string;
  preheader: string;
  lensBadge?: "PASS" | "ME" | "ACCOUNT" | "SECURITY" | "CIRCLE";
  kicker?: string;
  heading: string;
  greeting?: string;
  paragraphs: string[];
  detailsCard?: Array<{ label: string; value: string }>;
  ctaLabel?: string;
  ctaUrl?: string;
  secondaryCtaLabel?: string;
  secondaryCtaUrl?: string;
  fallbackUrlNote?: string;
  finePrint?: string;
  site?: string;
  unsubscribeUrl?: string;
}

/**
 * Universal AirPal Master Brand Email Container.
 * Renders a crisp card layout on bone/obsidian canvas with high-contrast text and 48px tap targets.
 */
export function wrapBrandEmail(opts: WrapBrandEmailOptions): EmailRenderOutput {
  const site = (opts.site || EMAIL_BRAND.site).replace(/\/$/, "");
  const lensBadgeText =
    opts.lensBadge === "PASS"
      ? "AIRPAL PASS · EVENTS &amp; TICKETS"
      : opts.lensBadge === "ME"
        ? "AIRPAL.ME · PERSONAL BIO"
        : opts.lensBadge === "SECURITY"
          ? "AIRPAL TRUST &amp; SECURITY"
          : opts.lensBadge === "CIRCLE"
            ? "AIRPAL CIRCLE · NETWORKING"
            : "AIRPAL · LIFE MADE EASY";

  const kickerHtml = opts.kicker
    ? `<p style="margin:0 0 8px 0;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${EMAIL_BRAND.brandBlue};">${escapeHtml(opts.kicker)}</p>`
    : "";

  const paragraphsHtml = opts.paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:${EMAIL_BRAND.lightInk};font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',Roboto,Helvetica,Arial,sans-serif;">${escapeHtml(p)}</p>`,
    )
    .join("");

  let detailsCardHtml = "";
  if (opts.detailsCard && opts.detailsCard.length > 0) {
    const rows = opts.detailsCard
      .map(
        (item) => `
        <tr>
          <td style="padding:7px 0;font-size:13px;color:${EMAIL_BRAND.lightMute};font-weight:500;width:38%;">${escapeHtml(item.label)}</td>
          <td style="padding:7px 0;font-size:14px;color:${EMAIL_BRAND.lightInk};font-weight:700;text-align:right;">${escapeHtml(item.value)}</td>
        </tr>`,
      )
      .join("");

    detailsCardHtml = `
      <div style="margin:20px 0;padding:16px 20px;background:#f9fafb;border:1px solid ${EMAIL_BRAND.lightBorder};border-radius:18px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          ${rows}
        </table>
      </div>`;
  }

  let ctaHtml = "";
  if (opts.ctaLabel && opts.ctaUrl) {
    const primary = `
      <a href="${escapeHtml(opts.ctaUrl)}" style="display:inline-block;background:${EMAIL_BRAND.brandBlue};color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;line-height:1;padding:15px 30px;border-radius:9999px;box-shadow:0 2px 6px rgba(0,78,255,0.25);">${escapeHtml(opts.ctaLabel)}</a>
    `;

    const secondary =
      opts.secondaryCtaLabel && opts.secondaryCtaUrl
        ? `&nbsp;&nbsp;&nbsp;<a href="${escapeHtml(opts.secondaryCtaUrl)}" style="display:inline-block;background:#ffffff;border:1px solid ${EMAIL_BRAND.lightBorder};color:${EMAIL_BRAND.lightInk};text-decoration:none;font-size:14px;font-weight:600;line-height:1;padding:14px 22px;border-radius:9999px;">${escapeHtml(opts.secondaryCtaLabel)}</a>`
        : "";

    ctaHtml = `
      <div style="margin:26px 0 16px 0;">
        ${primary}
        ${secondary}
      </div>`;
  }

  const fallbackLinkHtml = opts.ctaUrl
    ? `<p style="margin:16px 0 0 0;font-size:12px;line-height:1.5;color:${EMAIL_BRAND.lightMute};word-break:break-all;">${escapeHtml(opts.fallbackUrlNote || "If the button above does not work, copy and paste this link into your browser:")}<br /><a href="${escapeHtml(opts.ctaUrl)}" style="color:${EMAIL_BRAND.brandBlue};text-decoration:underline;">${escapeHtml(opts.ctaUrl)}</a></p>`
    : "";

  const unsubUrl = opts.unsubscribeUrl || `${site}/settings`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>${escapeHtml(opts.title)}</title>
  <style>
    :root { color-scheme: light dark; supported-color-schemes: light dark; }
    @media (prefers-color-scheme: dark) {
      .email-bg { background-color: ${EMAIL_BRAND.darkBg} !important; }
      .email-card { background-color: ${EMAIL_BRAND.darkCard} !important; border-color: ${EMAIL_BRAND.darkBorder} !important; }
      .email-heading { color: ${EMAIL_BRAND.darkInk} !important; }
      .email-text { color: ${EMAIL_BRAND.darkInk} !important; }
      .email-mute { color: ${EMAIL_BRAND.darkMute} !important; }
      .email-subcard { background-color: #1f221c !important; border-color: ${EMAIL_BRAND.darkBorder} !important; }
      .email-subcard td { color: ${EMAIL_BRAND.darkInk} !important; }
    }
  </style>
</head>
<body class="email-bg" style="margin:0;padding:0;background-color:${EMAIL_BRAND.lightBg};color:${EMAIL_BRAND.lightInk};-webkit-font-smoothing:antialiased;word-spacing:normal;">
  <!-- Hidden preheader for email preview snippets -->
  <div style="display:none;font-size:1px;color:#fefefe;line-height:1px;font-family:sans-serif;max-height:0px;max-width:0px;opacity:0;overflow:hidden;mso-hide:all;">
    ${escapeHtml(opts.preheader)}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="email-bg" style="background-color:${EMAIL_BRAND.lightBg};padding:32px 14px 48px 14px;border-collapse:collapse;">
    <tr>
      <td align="center">
        <!-- Main Card Wrapper -->
        <table role="presentation" width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;border-collapse:collapse;">
          <!-- Top Header Brand & Lens Bar -->
          <tr>
            <td style="padding:0 8px 18px 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                <tr>
                  <td align="left" style="font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',Roboto,sans-serif;font-size:20px;font-weight:800;letter-spacing:-0.03em;color:${EMAIL_BRAND.lightInk};" class="email-heading">
                    AirPal<span style="color:${EMAIL_BRAND.brandBlue};">.me</span>
                  </td>
                  <td align="right">
                    <span style="display:inline-block;padding:3px 10px;background:rgba(0,78,255,0.08);border:1px solid rgba(0,78,255,0.2);border-radius:9999px;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${EMAIL_BRAND.brandBlue};font-family:-apple-system,BlinkMacSystemFont,sans-serif;">
                      ${lensBadgeText}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Box -->
          <tr>
            <td class="email-card" style="background-color:${EMAIL_BRAND.lightCard};border:1px solid ${EMAIL_BRAND.lightBorder};border-radius:28px;padding:36px 32px 30px 32px;box-shadow:0 4px 20px -4px rgba(0,0,0,0.05);font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
              ${kickerHtml}
              <h1 class="email-heading" style="margin:0 0 16px 0;font-size:24px;font-weight:800;line-height:1.24;letter-spacing:-0.025em;color:${EMAIL_BRAND.lightInk};">
                ${escapeHtml(opts.heading)}
              </h1>
              ${opts.greeting ? `<p class="email-text" style="margin:0 0 16px 0;font-size:16px;font-weight:600;color:${EMAIL_BRAND.lightInk};">${escapeHtml(opts.greeting)}</p>` : ""}
              ${paragraphsHtml}
              ${detailsCardHtml}
              ${ctaHtml}
              ${fallbackLinkHtml}
            </td>
          </tr>

          <!-- Master Brand Footer -->
          <tr>
            <td style="padding:22px 12px 0 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:${EMAIL_BRAND.lightMute};" class="email-mute">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                <tr>
                  <td style="padding-bottom:12px;">
                    <strong style="color:${EMAIL_BRAND.lightInk};" class="email-heading">AirPal</strong> · Life Made Easy<br />
                    ${escapeHtml(opts.finePrint || "You received this notification for your universal AirPal account.")}
                  </td>
                </tr>
                <tr>
                  <td style="border-top:1px solid ${EMAIL_BRAND.lightBorder};padding-top:12px;" class="email-mute">
                    <a href="${site}/pass" style="color:${EMAIL_BRAND.brandBlue};text-decoration:none;font-weight:600;">Passbook</a>
                    &nbsp;·&nbsp;
                    <a href="${site}/events" style="color:${EMAIL_BRAND.brandBlue};text-decoration:none;font-weight:600;">Events</a>
                    &nbsp;·&nbsp;
                    <a href="${site}/circle" style="color:${EMAIL_BRAND.brandBlue};text-decoration:none;font-weight:600;">Circle</a>
                    &nbsp;·&nbsp;
                    <a href="${site}/settings" style="color:${EMAIL_BRAND.brandBlue};text-decoration:none;font-weight:600;">Settings</a>
                    &nbsp;·&nbsp;
                    <a href="${escapeHtml(unsubUrl)}" style="color:${EMAIL_BRAND.lightMute};text-decoration:underline;">Unsubscribe / Preferences</a>
                    <br />
                    <span style="font-size:11px;color:${EMAIL_BRAND.lightMute};">Sydney, New South Wales, Australia · Single Universal Account Architecture</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const textLines = [
    opts.title,
    "=".repeat(opts.title.length),
    "",
    opts.heading,
    "",
    ...(opts.greeting ? [opts.greeting, ""] : []),
    ...opts.paragraphs,
    "",
  ];

  if (opts.detailsCard && opts.detailsCard.length > 0) {
    textLines.push("DETAILS:");
    for (const item of opts.detailsCard) {
      textLines.push(`• ${item.label}: ${item.value}`);
    }
    textLines.push("");
  }

  if (opts.ctaLabel && opts.ctaUrl) {
    textLines.push(`${opts.ctaLabel}: ${opts.ctaUrl}`);
    textLines.push("");
  }

  if (opts.secondaryCtaLabel && opts.secondaryCtaUrl) {
    textLines.push(`${opts.secondaryCtaLabel}: ${opts.secondaryCtaUrl}`);
    textLines.push("");
  }

  textLines.push(
    "---",
    "AirPal · Life Made Easy",
    "Manage preferences: " + unsubUrl,
    "Sydney, NSW, Australia",
  );

  return {
    subject: opts.title,
    preheader: opts.preheader,
    html,
    text: textLines.join("\n"),
  };
}

/**
 * 1. Ticket Confirmation & Digital Admission Pass Email
 */
export function ticketConfirmationEmail(input: {
  name?: string;
  email: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  venue: string;
  city: string;
  ticketTier?: string;
  spots: number;
  totalFormatted: string;
  bookingId: string;
  passUrl?: string;
  site?: string;
}): EmailRenderOutput {
  const site = (input.site || EMAIL_BRAND.site).replace(/\/$/, "");
  const first = greetingFirstName(input.name);
  const passUrl = input.passUrl || `${site}/ticket/${input.bookingId}`;
  const passbookUrl = `${site}/me/tickets`;

  return wrapBrandEmail({
    title: `🎟️ Your ticket for ${input.eventTitle} — AirPal Pass`,
    preheader: `Your admission pass for ${input.eventTitle} is ready. Show your QR code at the door.`,
    lensBadge: "PASS",
    kicker: "Booking Confirmed",
    heading: `You're going to ${input.eventTitle}!`,
    greeting: first ? `Hi ${first},` : "Hi there,",
    paragraphs: [
      `Your booking for ${input.eventTitle} is confirmed and your native admission pass is ready.`,
      `You can display the live barcode pass right from your mobile browser or Apple/Google Wallet passbook at the door.`,
    ],
    detailsCard: [
      { label: "Event", value: input.eventTitle },
      { label: "Date & Time", value: `${input.eventDate} at ${input.eventTime}` },
      { label: "Venue", value: `${input.venue}, ${input.city}` },
      { label: "Tickets", value: `${input.spots}x ${input.ticketTier || "General Admission"}` },
      { label: "Total Paid", value: input.totalFormatted },
      { label: "Booking Ref", value: `#${input.bookingId.slice(0, 10).toUpperCase()}` },
    ],
    ctaLabel: "View Ticket & QR Pass",
    ctaUrl: passUrl,
    secondaryCtaLabel: "My Passbook",
    secondaryCtaUrl: passbookUrl,
    finePrint: `AirPal Pass issued this receipt for ${input.email}. Tickets are verifiable at the door scanner.`,
    site,
  });
}

/**
 * 2. Event RSVP Confirmation Email
 */
export function eventRsvpConfirmationEmail(input: {
  name?: string;
  email: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  venue: string;
  city: string;
  eventId: string;
  site?: string;
}): EmailRenderOutput {
  const site = (input.site || EMAIL_BRAND.site).replace(/\/$/, "");
  const first = greetingFirstName(input.name);
  const eventUrl = `${site}/e/${input.eventId}`;

  return wrapBrandEmail({
    title: `Confirmed: You're on the list for ${input.eventTitle} — AirPal`,
    preheader: `Your RSVP is confirmed. See date, venue, and live door access details.`,
    lensBadge: "PASS",
    kicker: "RSVP Confirmed",
    heading: `See you at ${input.eventTitle}!`,
    greeting: first ? `Hi ${first},` : "Hi there,",
    paragraphs: [
      `Your RSVP has been added to the official door list for ${input.eventTitle}.`,
      `Save the date and show up on time — the host will have your name on the door scanner.`,
    ],
    detailsCard: [
      { label: "Event", value: input.eventTitle },
      { label: "Date & Time", value: `${input.eventDate} at ${input.eventTime}` },
      { label: "Location", value: `${input.venue}, ${input.city}` },
      { label: "Admission", value: "RSVP on Door List" },
    ],
    ctaLabel: "View Event Details",
    ctaUrl: eventUrl,
    secondaryCtaLabel: "Add to Calendar",
    secondaryCtaUrl: `${eventUrl}?action=calendar`,
    finePrint: `Sent to ${input.email}. You can update your RSVP attendance anytime from the event page.`,
    site,
  });
}

/**
 * 3. Personal Catch-Up / Meeting Proposal Email
 */
export function catchUpProposalEmail(input: {
  recipientName?: string;
  recipientEmail: string;
  requesterName: string;
  requesterHandle?: string;
  typeLabel: string;
  date: string;
  time: string;
  venue?: string;
  catchupId: string;
  site?: string;
}): EmailRenderOutput {
  const site = (input.site || EMAIL_BRAND.site).replace(/\/$/, "");
  const first = greetingFirstName(input.recipientName);
  const catchupUrl = `${site}/circle?catchup=${input.catchupId}`;
  const handleMention = input.requesterHandle ? `@${input.requesterHandle.replace(/^@/, "")}` : input.requesterName;

  return wrapBrandEmail({
    title: `☕ ${input.requesterName} proposed a ${input.typeLabel} — AirPal`,
    preheader: `${handleMention} proposed a catch-up with you on ${input.date}. One tap to accept or suggest another slot.`,
    lensBadge: "ME",
    kicker: "Networking & Catch-Up",
    heading: `${input.requesterName} wants to catch up`,
    greeting: first ? `Hi ${first},` : "Hi there,",
    paragraphs: [
      `${handleMention} sent you a proposal for a ${input.typeLabel.toLowerCase()} in your AirPal Circle.`,
      `Review the suggested slot below and confirm in one tap.`,
    ],
    detailsCard: [
      { label: "With", value: `${input.requesterName} (${handleMention})` },
      { label: "Activity", value: input.typeLabel },
      { label: "Proposed Slot", value: `${input.date} at ${input.time}` },
      ...(input.venue ? [{ label: "Venue / Place", value: input.venue }] : []),
    ],
    ctaLabel: "Accept or Suggest Time",
    ctaUrl: catchupUrl,
    finePrint: `This proposal was sent to your connected account at ${input.recipientEmail}. Manage presence in Circle.`,
    site,
  });
}

/**
 * 4. Creator / Organiser Broadcast Announcement Email
 */
export function broadcastAnnouncementEmail(input: {
  title: string;
  body: string;
  authorName: string;
  authorHandle?: string;
  href?: string;
  recipientEmail: string;
  site?: string;
}): EmailRenderOutput {
  const site = (input.site || EMAIL_BRAND.site).replace(/\/$/, "");
  const targetUrl = input.href ? (input.href.startsWith("http") ? input.href : `${site}${input.href}`) : `${site}/me/inbox`;
  const handleStr = input.authorHandle ? `@${input.authorHandle.replace(/^@/, "")}` : input.authorName;

  return wrapBrandEmail({
    title: `${input.title} — ${handleStr}`,
    preheader: `${input.body.slice(0, 110)}...`,
    lensBadge: "CIRCLE",
    kicker: "Circle Update",
    heading: input.title,
    paragraphs: [
      `New announcement from ${handleStr}:`,
      input.body,
    ],
    ctaLabel: "View in AirPal",
    ctaUrl: targetUrl,
    finePrint: `You are receiving this update because you follow ${handleStr} on AirPal. Manage alerts in Settings.`,
    site,
    unsubscribeUrl: `${site}/settings`,
  });
}

/**
 * 5. Welcome Account Email (Life Made Easy)
 */
export function welcomeAccountEmail(input: {
  name?: string;
  email: string;
  handle?: string;
  site?: string;
}): EmailRenderOutput {
  const site = (input.site || EMAIL_BRAND.site).replace(/\/$/, "");
  const first = greetingFirstName(input.name);

  return wrapBrandEmail({
    title: "Welcome to AirPal — Life Made Easy ✨",
    preheader: "Your single universal account for live events, concert tickets, and your personal digital bio.",
    lensBadge: "ACCOUNT",
    kicker: "Welcome to AirPal",
    heading: "Life Made Easy.",
    greeting: first ? `Welcome, ${first}!` : "Welcome to AirPal!",
    paragraphs: [
      "Your universal AirPal account is ready. Everything you do across live concerts, Indian festivals, digital tickets, and community circles lives in this single account.",
      "Here is how your dual-lens ecosystem works:",
      "🎟️ AirPal Pass: Browse upcoming live concerts and festivals, secure Stripe-backed tickets, and access your passbook on Apple/Google Wallet.",
      "✨ AirPal.Me: Claim your personal @handle, share your live status, and catch up with friends in your dedicated Networking Circle.",
    ],
    detailsCard: [
      { label: "Account Email", value: input.email },
      ...(input.handle ? [{ label: "Your Handle", value: `@${input.handle.replace(/^@/, "")}` }] : []),
      { label: "Status", value: "Verified Active" },
    ],
    ctaLabel: input.handle ? "View My Bio Profile" : "Claim Your @Handle",
    ctaUrl: input.handle ? `${site}/@${input.handle.replace(/^@/, "")}` : `${site}/bio/setup`,
    secondaryCtaLabel: "Explore Events",
    secondaryCtaUrl: `${site}/events`,
    finePrint: `AirPal sent this welcome orientation to ${input.email}. We will never share your personal data.`,
    site,
  });
}
