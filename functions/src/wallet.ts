import { PKPass } from "passkit-generator";
import { defineSecret } from "firebase-functions/params";
import { onRequest } from "firebase-functions/v2/https";
import { ticketAdmitCheck, ticketGateUrl } from "../../shared/booking";
import { auth, db } from "./admin";
import { cardFieldsFromProfile } from "./pass-profile";

/**
 * Apple Wallet .pkpass endpoint: GET /api/wallet/ticket/:id.pkpass and
 * GET /api/wallet/card/:handle.pkpass (see firebase.json rewrite).
 *
 * Signing needs the brand's Pass Type ID certificate, installed as secrets
 * (docs/WALLET.md). Until then every request answers 501 and the
 * client shows "not set up yet" instead of downloading garbage.
 */

const passTypeIdSecret = defineSecret("WALLET_PASS_TYPE_ID");
const teamIdSecret = defineSecret("WALLET_TEAM_ID");
const signerCertSecret = defineSecret("WALLET_SIGNER_CERT");
const signerKeySecret = defineSecret("WALLET_SIGNER_KEY");
const keyPassphraseSecret = defineSecret("WALLET_KEY_PASSPHRASE");

type SecretParam = { value: () => string };

function readSecret(param: SecretParam, envName: string): string {
  try {
    const value = param.value();
    if (value) return value;
  } catch {
    /* fall through to env (emulator / tests) */
  }
  return process.env[envName] || "";
}

/** Apple WWDR G4 intermediate (public, expires Dec 2030). Refetch from Apple PKI when rotating. */
const WWDR_G4_PEM = `-----BEGIN CERTIFICATE-----
MIIEVTCCAz2gAwIBAgIUE9x3lVJx5T3GMujM/+Uh88zFztIwDQYJKoZIhvcNAQEL
BQAwYjELMAkGA1UEBhMCVVMxEzARBgNVBAoTCkFwcGxlIEluYy4xJjAkBgNVBAsT
HUFwcGxlIENlcnRpZmljYXRpb24gQXV0aG9yaXR5MRYwFAYDVQQDEw1BcHBsZSBS
b290IENBMB4XDTIwMTIxNjE5MzYwNFoXDTMwMTIxMDAwMDAwMFowdTFEMEIGA1UE
Aww7QXBwbGUgV29ybGR3aWRlIERldmVsb3BlciBSZWxhdGlvbnMgQ2VydGlmaWNh
dGlvbiBBdXRob3JpdHkxCzAJBgNVBAsMAkc0MRMwEQYDVQQKDApBcHBsZSBJbmMu
MQswCQYDVQQGEwJVUzCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBANAf
eKp6JzKwRl/nF3bYoJ0OKY6tPTKlxGs3yeRBkWq3eXFdDDQEYHX3rkOPR8SGHgjo
v9Y5Ui8eZ/xx8YJtPH4GUnadLLzVQ+mxtLxAOnhRXVGhJeG+bJGdayFZGEHVD41t
QSo5SiHgkJ9OE0/QjJoyuNdqkh4laqQyziIZhQVg3AJK8lrrd3kCfcCXVGySjnYB
5kaP5eYq+6KwrRitbTOFOCOL6oqW7Z+uZk+jDEAnbZXQYojZQykn/e2kv1MukBVl
PNkuYmQzHWxq3Y4hqqRfFcYw7V/mjDaSlLfcOQIA+2SM1AyB8j/VNJeHdSbCb64D
YyEMe9QbsWLFApy9/a8CAwEAAaOB7zCB7DASBgNVHRMBAf8ECDAGAQH/AgEAMB8G
A1UdIwQYMBaAFCvQaUeUdgn+9GuNLkCm90dNfwheMEQGCCsGAQUFBwEBBDgwNjA0
BggrBgEFBQcwAYYoaHR0cDovL29jc3AuYXBwbGUuY29tL29jc3AwMy1hcHBsZXJv
b3RjYTAuBgNVHR8EJzAlMCOgIaAfhh1odHRwOi8vY3JsLmFwcGxlLmNvbS9yb290
LmNybDAdBgNVHQ4EFgQUW9n6HeeaGgujmXYiUIY+kchbd6gwDgYDVR0PAQH/BAQD
AgEGMBAGCiqGSIb3Y2QGAgEEAgUAMA0GCSqGSIb3DQEBCwUAA4IBAQA/Vj2e5bbD
eeZFIGi9v3OLLBKeAuOugCKMBB7DUshwgKj7zqew1UJEggOCTwb8O0kU+9h0UoWv
p50h5wESA5/NQFjQAde/MoMrU1goPO6cn1R2PWQnxn6NHThNLa6B5rmluJyJlPef
x4elUWY0GzlxOSTjh2fvpbFoe4zuPfeutnvi0v/fYcZqdUmVIkSoBPyUuAsuORFJ
EtHlgepZAE9bPFo22noicwkJac3AfOriJP6YRLj477JxPxpd1F1+M02cHSS+APCQ
A1iZQT0xWmJArzmoUUOSqwSonMJNsUvSq3xKX+udO7xPiEAGE/+QF4oIRynoYpgp
pU8RBWk6z/Kf
-----END CERTIFICATE-----`;

/** Pass icon: public/favicon-32.png, base64 (Apple requires icon.png). */
const ICON_PNG_B64 =
  "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";

/** Pass wordmark: white AirPal Me logo, 360px (Apple renders logo.png small). */
const LOGO_PNG_B64 =
  "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";

type DocData = Record<string, unknown> | null;

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

async function getDocData(collection: string, id: string): Promise<DocData> {
  if (!id) return null;
  const snap = await db.collection(collection).doc(id).get();
  return snap.exists ? (snap.data() as Record<string, unknown>) : null;
}

interface SignerConfig {
  passTypeIdentifier: string;
  teamIdentifier: string;
  signerCert: string;
  signerKey: string;
  signerKeyPassphrase?: string;
}

function signerConfig(): SignerConfig | null {
  const passTypeIdentifier = readSecret(passTypeIdSecret, "WALLET_PASS_TYPE_ID").trim();
  const teamIdentifier = readSecret(teamIdSecret, "WALLET_TEAM_ID").trim();
  const signerCert = readSecret(signerCertSecret, "WALLET_SIGNER_CERT");
  const signerKey = readSecret(signerKeySecret, "WALLET_SIGNER_KEY");
  if (!passTypeIdentifier || !teamIdentifier || !signerCert.includes("BEGIN") || !signerKey.includes("BEGIN")) {
    return null;
  }
  const signerKeyPassphrase = readSecret(keyPassphraseSecret, "WALLET_KEY_PASSPHRASE");
  return { passTypeIdentifier, teamIdentifier, signerCert, signerKey, signerKeyPassphrase };
}

/** Luma-style layout on AirPal Blue: date/time header, big title, location, guest + host, QR. */
export interface TicketPassInput {
  bookingId: string;
  title: string;
  date: string;
  time: string;
  suburb: string;
  providerName: string;
  status: string;
  guestName: string;
  tier?: string;
  spots?: number;
}

export interface CardPassInput {
  handle: string;
  name: string;
  bio: string;
  city?: string;
  kind?: string;
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/** Stored local values only — no timezone claims. "2026-10-02" -> "02 OCT 2026". */
export function formatPassDate(date: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date.trim());
  if (!m) return date.trim();
  const month = MONTHS[Number(m[2]) - 1] || m[2];
  return `${m[3]} ${month} ${m[1]}`;
}

/** "19:00" -> "7:00 PM". */
export function formatPassTime(time: string): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(time.trim());
  if (!m) return time.trim();
  let hours = Number(m[1]) % 24;
  const suffix = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${m[2]} ${suffix}`;
}

export function ticketPassJson(input: TicketPassInput): Record<string, unknown> {
  const when = [formatPassDate(input.date), formatPassTime(input.time)].filter(Boolean).join(" · ");
  const secondaryFields = [
    { key: "location", label: "LOCATION", value: input.suburb || input.providerName || "AirPal" },
  ];
  if (input.tier) {
    secondaryFields.push({ key: "tier", label: "TIER", value: input.tier });
  }

  const auxiliaryFields: Array<{ key: string; label: string; value: string }> = [
    { key: "guest", label: "GUEST", value: input.guestName || "Guest" },
    { key: "host", label: "HOST", value: input.providerName || "AirPal" },
  ];
  if (input.spots && input.spots > 1) {
    auxiliaryFields.push({ key: "spots", label: "PASSES", value: `${input.spots} Guests` });
  }

  return {
    formatVersion: 1,
    organizationName: "AirPal.me",
    description: `${input.title} — AirPal ticket`,
    serialNumber: `ticket-${input.bookingId}`,
    backgroundColor: "rgb(0,78,255)",
    foregroundColor: "rgb(255,255,255)",
    labelColor: "rgb(225,225,235)",
    eventTicket: {
      headerFields: [{ key: "when", label: "", value: when || "See booking" }],
      primaryFields: [{ key: "event", label: "", value: input.title }],
      secondaryFields,
      auxiliaryFields,
      backFields: [
        { key: "booking", label: "Booking ID", value: input.bookingId },
        { key: "status", label: "Status", value: input.status || "confirmed" },
        ...(input.tier ? [{ key: "tier", label: "Ticket Tier", value: input.tier }] : []),
        ...(input.spots && input.spots > 1 ? [{ key: "spots", label: "Admit Count", value: String(input.spots) }] : []),
        {
          key: "entry",
          label: "Door Admission",
          value: "Present this pass at the gate. Staff will scan your QR code for rapid entry.",
        },
        { key: "app", label: "AirPal Pass", value: "Live concerts, festivals & experiences · Life Made Easy" },
      ],
    },
  };
}

export function cardPassJson(input: CardPassInput): Record<string, unknown> {
  const url = `https://airpal.me/@${input.handle}`;
  const business = input.kind === "business";
  return {
    formatVersion: 1,
    organizationName: "AirPal.me",
    description: business ? `${input.name} — AirPal Business Card` : `${input.name} on AirPal`,
    serialNumber: `card-${input.handle}`,
    backgroundColor: "rgb(8, 64, 232)",
    foregroundColor: "rgb(255,255,255)",
    labelColor: "rgb(225,225,235)",
    storeCard: {
      primaryFields: [{ key: "name", label: "AIRPAL", value: input.name }],
      secondaryFields: [{ key: "handle", label: "HANDLE", value: `@${input.handle}` }],
      auxiliaryFields: input.city ? [{ key: "city", label: "CITY", value: input.city }] : [],
      backFields: [
        { key: "profile", label: "Profile", value: url },
        ...(input.bio ? [{ key: "bio", label: "About", value: input.bio.slice(0, 200) }] : []),
        ...(input.city ? [{ key: "city", label: "City", value: input.city }] : []),
        ...(input.kind ? [{ key: "kind", label: "Account", value: business ? "Business" : "Individual" }] : []),
      ],
    },
  };
}

async function buildPassBuffer(
  cfg: SignerConfig,
  passJson: Record<string, unknown>,
  serialNumber: string,
  barcodeMessage: string,
  logo?: Buffer,
): Promise<Buffer> {
  const icon = Buffer.from(ICON_PNG_B64, "base64");
  const wordmark = logo ?? icon;
  const fullJson = {
    ...passJson,
    passTypeIdentifier: cfg.passTypeIdentifier,
    teamIdentifier: cfg.teamIdentifier,
  };
  const pass = new PKPass(
    {
      "pass.json": Buffer.from(JSON.stringify(fullJson)),
      "icon.png": icon,
      "icon@2x.png": icon,
      "logo.png": wordmark,
      "logo@2x.png": wordmark,
    },
    {
      wwdr: WWDR_G4_PEM,
      signerCert: cfg.signerCert,
      signerKey: cfg.signerKey,
      ...(cfg.signerKeyPassphrase ? { signerKeyPassphrase: cfg.signerKeyPassphrase } : {}),
    },
    { serialNumber },
  );
  pass.setBarcodes({
    format: "PKBarcodeFormatQR",
    message: barcodeMessage,
    messageEncoding: "iso-8859-1",
    altText: serialNumber.replace(/^(ticket|card)-/, ""),
  });
  return pass.getAsBuffer();
}

async function guestNameFor(customerUid: string): Promise<string> {
  if (!customerUid) return "Guest";
  try {
    const user = await getDocData("users", customerUid);
    return str(user?.displayName) || str(user?.firstName) || "Guest";
  } catch {
    return "Guest";
  }
}

async function ticketPassBuffer(bookingId: string, cfg: SignerConfig): Promise<Buffer | null> {
  const booking = await getDocData("bookings", bookingId);
  if (!booking || !ticketAdmitCheck(booking).valid) return null;
  let eventName = "";
  let tierName = "";
  const eventId = str(booking.eventId);
  if (eventId) {
    const event = await getDocData("events", eventId);
    eventName = str(event?.name);
    if (booking.tierId && Array.isArray(event?.ticketTiers)) {
      const foundTier = (event.ticketTiers as Array<{ id?: unknown; name?: unknown }>).find(
        (t) => t && String(t.id) === String(booking.tierId),
      );
      if (foundTier && typeof foundTier.name === "string") {
        tierName = foundTier.name;
      }
    }
  }
  const spots = Number(booking.spots);
  const passJson = ticketPassJson({
    bookingId,
    title: eventName || str(booking.title) || "AirPal booking",
    date: str(booking.date),
    time: str(booking.time),
    suburb: str(booking.suburb),
    providerName: str(booking.providerName),
    status: str(booking.status),
    guestName: await guestNameFor(str(booking.customerUid)),
    tier: tierName || undefined,
    spots: Number.isFinite(spots) && spots > 1 ? spots : undefined,
  });
  const gateUrl = ticketGateUrl({
    id: bookingId,
    eventId: str(booking.eventId) || undefined,
  });
  return buildPassBuffer(cfg, passJson, `ticket-${bookingId}`, gateUrl);
}

async function ticketOwnerUid(req: {
  headers?: Record<string, string | string[] | undefined>;
  query?: Record<string, unknown>;
}): Promise<string | null> {
  const value = req.headers?.authorization || req.headers?.Authorization;
  const header = Array.isArray(value) ? value[0] : value;
  let token = /^Bearer\s+(.+)$/i.exec(String(header || ""))?.[1];
  if (!token && req.query) {
    const raw = req.query.token || req.query.auth;
    if (typeof raw === "string") token = raw;
    else if (Array.isArray(raw) && typeof raw[0] === "string") token = raw[0];
  }
  if (!token) return null;
  try {
    return (await auth.verifyIdToken(token)).uid;
  } catch {
    return null;
  }
}

async function ownsTicket(bookingId: string, uid: string): Promise<boolean> {
  const booking = await getDocData("bookings", bookingId);
  return Boolean(booking && String(booking.customerUid || "") === uid && ticketAdmitCheck(booking).valid);
}

async function cardPassBuffer(handle: string, cfg: SignerConfig): Promise<Buffer | null> {
  const normalized = handle.trim().replace(/^@+/, "").toLowerCase();
  if (!normalized) return null;
  const handleDoc = await getDocData("handles", normalized);
  const profileId = str(handleDoc?.profileId) || str(handleDoc?.ownerUid);
  if (!profileId) return null;
  const profile = (await getDocData("profiles", profileId)) || (await getDocData("users", profileId));
  if (!profile) return null;
  const fields = cardFieldsFromProfile(profile, normalized);
  const passJson = cardPassJson({
    handle: normalized,
    name: fields.name,
    bio: fields.bio,
    city: fields.city,
    kind: fields.kind,
  });
  const wordmark = Buffer.from(LOGO_PNG_B64, "base64");
  return buildPassBuffer(cfg, passJson, `card-${normalized}`, `https://airpal.me/@${normalized}`, wordmark);
}

export const walletPass = onRequest(
  {
    invoker: "public",
    secrets: [passTypeIdSecret, teamIdSecret, signerCertSecret, signerKeySecret, keyPassphraseSecret],
  },
  async (req, res) => {
    if (typeof res.set === "function") {
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      // Ticket fetches attach an auth header, so it must be allow-listed here
      // or browsers block the request at preflight.
      res.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
    }
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.status(405).send("Method not allowed");
      return;
    }
    const match = /\/(ticket|card)\/([^/]+)\.pkpass$/.exec(req.path || "");
    if (!match) {
      res.status(400).json({ error: "bad_request" });
      return;
    }
    const [, kind, rawKey] = match as unknown as [string, "ticket" | "card", string];
    const key = decodeURIComponent(rawKey);
    if (kind === "ticket") {
      const uid = await ticketOwnerUid(req);
      if (!uid || !(await ownsTicket(key, uid))) {
        res.status(404).json({ error: "pass_not_found" });
        return;
      }
    }
    const cfg = signerConfig();
    try {
      const buffer =
        kind === "ticket" ? cfg && (await ticketPassBuffer(key, cfg)) : cfg && (await cardPassBuffer(key, cfg));
      // Unknown booking/handle 404s even before checking signer config below;
      // configured-but-missing docs and unconfigured signer both land here.
      if (!buffer) {
        if (!cfg) {
          res.status(501).json({ error: "wallet_not_configured" });
          return;
        }
        res.status(404).json({ error: kind === "ticket" ? "booking_not_found" : "profile_not_found" });
        return;
      }
      res.set("Content-Type", "application/vnd.apple.pkpass");
      const downloadName =
        kind === "card"
          ? `@${encodeURIComponent(key)}-AirPal-Pass.pkpass`
          : `${kind}-${encodeURIComponent(key)}.pkpass`;
      res.set("Content-Disposition", `attachment; filename="${downloadName}"`);
      res.set("Cache-Control", "private, max-age=300");
      if (req.method === "HEAD") {
        res.set("Content-Length", String(buffer.length));
        res.status(200).end();
        return;
      }
      res.status(200).send(buffer);
    } catch (err) {
      console.error("walletPass failed:", err);
      res.status(500).json({ error: "wallet_sign_failed" });
    }
  },
);
