import { describe, expect, it } from "vitest";
import {
  ticketConfirmationEmail,
  eventRsvpConfirmationEmail,
  catchUpProposalEmail,
  broadcastAnnouncementEmail,
  welcomeAccountEmail,
  accountVerificationEmail,
  passwordResetEmail,
  emailChangeEmail,
  mfaEnrolledEmail,
  firebaseConsoleTemplate,
  wrapBrandEmail,
  EMAIL_BRAND,
} from "./email-templates";

describe("shared/email-templates", () => {
  it("exports valid EMAIL_BRAND configuration", () => {
    expect(EMAIL_BRAND.from).toBe("AirPal <noreply@email.airpal.me>");
    expect(EMAIL_BRAND.site).toBe("https://airpal.me");
  });

  it("wraps brand emails with Master Brand header, dark mode CSS, and universal account footer", () => {
    const rendered = wrapBrandEmail({
      title: "Test Title",
      preheader: "Preview snippet here",
      lensBadge: "PASS",
      kicker: "Exclusive",
      heading: "Welcome to Live Music",
      paragraphs: ["Here is paragraph 1.", "Here is paragraph 2."],
      detailsCard: [
        { label: "Date", value: "Oct 25, 2026" },
        { label: "Venue", value: "Metro Theatre, Sydney" },
      ],
      ctaLabel: "View Tickets",
      ctaUrl: "https://airpal.me/pass",
    });

    expect(rendered.subject).toBe("Test Title");
    expect(rendered.preheader).toBe("Preview snippet here");
    expect(rendered.html).toContain("AirPal");
    expect(rendered.html).toContain("AIRPAL PASS · EVENTS &amp; TICKETS");
    expect(rendered.html).toContain("Metro Theatre, Sydney");
    expect(rendered.html).toContain("View Tickets");
    expect(rendered.html).toContain("Life Made Easy");
    expect(rendered.text).toContain("Test Title");
    expect(rendered.text).toContain("Date: Oct 25, 2026");
    expect(rendered.text).toContain("View Tickets: https://airpal.me/pass");
  });

  it("builds a ticket confirmation email with booking reference and wallet links", () => {
    const email = ticketConfirmationEmail({
      name: "Bibin Jose",
      email: "bibin@example.com",
      eventTitle: "Diwali Night Concert 2026",
      eventDate: "Friday, 24 October 2026",
      eventTime: "7:00 PM",
      venue: "Hordern Pavilion",
      city: "Sydney",
      ticketTier: "VIP Early Access",
      spots: 2,
      totalFormatted: "$120.00 AUD",
      bookingId: "bk_1234567890abcdef",
    });

    expect(email.subject).toContain("Diwali Night Concert 2026");
    expect(email.html).toContain("Diwali Night Concert 2026");
    expect(email.html).toContain("VIP Early Access");
    expect(email.html).toContain("$120.00 AUD");
    expect(email.html).toContain("Hordern Pavilion, Sydney");
    expect(email.html).toContain("View Ticket &amp; QR Pass");
    expect(email.text).toContain("Booking Ref: #BK_1234567");
  });

  it("builds an RSVP confirmation email", () => {
    const email = eventRsvpConfirmationEmail({
      name: "Aarav Sharma",
      email: "aarav@example.com",
      eventTitle: "Surry Hills Coffee & Indie Tech",
      eventDate: "Saturday, 15 November 2026",
      eventTime: "10:30 AM",
      venue: "Single O Surry Hills",
      city: "Sydney",
      eventId: "evt_surry_coffee",
    });

    expect(email.subject).toContain("You're on the list");
    expect(email.html).toContain("Surry Hills Coffee &amp; Indie Tech");
    expect(email.html).toContain("RSVP on Door List");
    expect(email.text).toContain("Saturday, 15 November 2026 at 10:30 AM");
  });

  it("builds a personal catch-up invitation email", () => {
    const email = catchUpProposalEmail({
      recipientName: "Zara Khan",
      recipientEmail: "zara@example.com",
      requesterName: "Ava Mitchell",
      requesterHandle: "avamitchell",
      typeLabel: "Coffee Catch-up",
      date: "Tuesday, 28 October 2026",
      time: "2:00 PM",
      venue: "Edition Roasters, Haymarket",
      catchupId: "cu_987654321",
    });

    expect(email.subject).toContain("Ava Mitchell proposed a Coffee Catch-up");
    expect(email.html).toContain("@avamitchell");
    expect(email.html).toContain("Edition Roasters, Haymarket");
    expect(email.text).toContain("Tuesday, 28 October 2026 at 2:00 PM");
    expect(email.text).toContain("Accept or Suggest Time:");
  });

  it("builds a creator broadcast announcement email", () => {
    const email = broadcastAnnouncementEmail({
      title: "Secret Stage Times Released",
      body: "Doors open at 6 PM sharp. Arrive early for the opening acoustic set.",
      authorName: "Sydney Beats Crew",
      authorHandle: "sydneybeats",
      href: "/e/sydney-beats-live",
      recipientEmail: "fan@example.com",
    });

    expect(email.subject).toContain("Secret Stage Times Released");
    expect(email.html).toContain("@sydneybeats");
    expect(email.html).toContain("Doors open at 6 PM sharp");
    expect(email.text).toContain("View in AirPal:");
  });

  it("builds a welcome account email introducing the dual lens", () => {
    const email = welcomeAccountEmail({
      name: "Rohan Patel",
      email: "rohan@example.com",
      handle: "rohan",
    });

    expect(email.subject).toContain("Welcome to AirPal — Life Made Easy");
    expect(email.html).toContain("AirPal Pass");
    expect(email.html).toContain("AirPal.Me");
    expect(email.html).toContain("@rohan");
    expect(email.text).toContain("Account Email: rohan@example.com");
  });

  it("builds account verification email with universal account scope", () => {
    const email = accountVerificationEmail({
      name: "Priya Nair",
      email: "priya@example.com",
      link: "https://airpal.me/auth/action?mode=verifyEmail&oobCode=123",
    });

    expect(email.subject).toBe("Confirm your AirPal.me email");
    expect(email.html).toContain("Confirm email");
    expect(email.html).toContain("priya@example.com");
    expect(email.html).toContain("Account Verification");
    expect(email.text).toContain("Confirm email: https://airpal.me/auth/action?mode=verifyEmail&oobCode=123");
  });

  it("builds password reset email with security warnings", () => {
    const email = passwordResetEmail({
      name: "Aarav",
      email: "aarav@example.com",
      link: "https://airpal.me/auth/action?mode=resetPassword&oobCode=456",
    });

    expect(email.subject).toBe("Reset your AirPal.me password");
    expect(email.html).toContain("Choose a new password");
    expect(email.html).toContain("One-time link · Expires in 1 hour");
    expect(email.text).toContain("Choose a new password: https://airpal.me/auth/action?mode=resetPassword&oobCode=456");
  });

  it("builds email change confirmation email", () => {
    const email = emailChangeEmail({
      name: "Kavita",
      email: "kavita.old@example.com",
      newEmail: "kavita.new@example.com",
      link: "https://airpal.me/auth/action?mode=verifyAndChangeEmail&oobCode=789",
    });

    expect(email.subject).toBe("Confirm your new AirPal email address");
    expect(email.html).toContain("Confirm your new email address");
    expect(email.html).toContain("kavita.new@example.com");
    expect(email.html).toContain("Confirm new email");
    expect(email.text).toContain("New Email Address: kavita.new@example.com");
  });

  it("builds MFA enrolled security notification email", () => {
    const email = mfaEnrolledEmail({
      name: "Dev Sharma",
      email: "dev@example.com",
      phoneNumber: "+61 411 222 333",
    });

    expect(email.subject).toContain("Multi-factor authentication enrolled");
    expect(email.html).toContain("Multi-factor authentication active");
    expect(email.html).toContain("+61 411 222 333");
    expect(email.html).toContain("Review Security Settings");
    expect(email.text).toContain("Protected Account: dev@example.com");
  });

  it("generates console templates with valid Firebase variables", () => {
    const v = firebaseConsoleTemplate("verify");
    const r = firebaseConsoleTemplate("reset");
    const c = firebaseConsoleTemplate("emailChange");
    const m = firebaseConsoleTemplate("mfaEnrolled");

    expect(v.html).toContain("%LINK%");
    expect(v.html).toContain("%DISPLAY_NAME%");
    expect(r.html).toContain("%LINK%");
    expect(c.html).toContain("%NEW_EMAIL%");
    expect(m.html).toContain("%PHONE_NUMBER%");
  });
});
