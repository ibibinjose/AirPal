import { describe, expect, it } from "vitest";
import {
  applicationAdminCanTransition,
  applicationApplicantCanTransition,
  applicationCanTransition,
  DEMO_PASS_PARTNERS,
  isPartnerCategory,
  isPartnerSlug,
  isPartnerStatus,
  isPartnerWebsite,
  normalizePartnerApplication,
  normalizePartnerWebsite,
  partnerOfferHref,
  partnerSlugFor,
  slugifyPartnerName,
  validatePartnerApplication,
  validatePartnerOfferLink,
  validatePartnerProfile,
  isPartnerEmail,
  isPartnerSegment,
  isPartnerSource,
  validatePartnerLead,
} from "./partner";

const good = {
  segment: "stay",
  source: "google",
  company: "Harbour Hotel",
  name: "Ava Chen",
  email: "ava@harbourhotel.com.au",
  phone: "0400 000 000",
  message: "We run a 40-room boutique hotel and want to list on AirPal Stay.",
};

describe("partner leads", () => {
  it("accepts a complete inquiry", () => {
    expect(validatePartnerLead(good)).toEqual([]);
  });

  it("rejects bad segments, sources, emails, and short messages", () => {
    expect(validatePartnerLead({ ...good, segment: "hotel" })).toContain("Choose what kind of partner you are.");
    expect(validatePartnerLead({ ...good, source: "billboard" })).toContain("Tell us how you found us.");
    expect(validatePartnerLead({ ...good, email: "not-an-email" })).toContain("Enter a valid email.");
    expect(validatePartnerLead({ ...good, message: "hi" })).toContain("Tell us a little more (10+ characters).");
    expect(validatePartnerLead({ ...good, company: "" })).toContain("Company name is required.");
  });

  it("validates helpers", () => {
    expect(isPartnerSegment("event")).toBe(true);
    expect(isPartnerSegment("hotel")).toBe(false);
    expect(isPartnerSource("ai")).toBe(true);
    expect(isPartnerSource("tv")).toBe(false);
    expect(isPartnerEmail("a@b.co")).toBe(true);
    expect(isPartnerEmail("a@b")).toBe(false);
  });
});

const goodApplication = {
  businessName: "Harbour Hotel",
  category: "stay",
  contactName: "Ava Chen",
  contactEmail: "ava@harbourhotel.com.au",
  website: "harbourhotel.com.au",
  pitch: "We run a 40-room boutique hotel and want to join the Pass directory.",
};

describe("pass partner applications", () => {
  it("accepts a complete application", () => {
    expect(validatePartnerApplication(goodApplication)).toEqual([]);
  });

  it("rejects bad categories, emails, websites, and short pitches", () => {
    expect(validatePartnerApplication({ ...goodApplication, category: "airline" })).toContain(
      "Choose a valid business category.",
    );
    expect(validatePartnerApplication({ ...goodApplication, contactEmail: "not-an-email" })).toContain(
      "Enter a valid contact email.",
    );
    expect(validatePartnerApplication({ ...goodApplication, website: "not a site" })).toContain(
      "Website looks invalid.",
    );
    expect(validatePartnerApplication({ ...goodApplication, pitch: "hi" })).toContain(
      "Tell us a little more (10+ characters).",
    );
    expect(validatePartnerApplication({ ...goodApplication, businessName: "" })).toContain(
      "Business name is required.",
    );
  });

  it("reuses the merchant taxonomy (no parallel category system)", () => {
    expect(isPartnerCategory("coffee")).toBe(true);
    expect(isPartnerCategory("airline")).toBe(false);
  });

  it("normalizes email, website, and whitespace", () => {
    const clean = normalizePartnerApplication({
      ...goodApplication,
      contactEmail: "  AVA@HarbourHotel.com.au ",
      website: "harbourhotel.com.au/menu",
    });
    expect(clean.contactEmail).toBe("ava@harbourhotel.com.au");
    expect(clean.website).toBe("https://harbourhotel.com.au/menu");
    expect(clean.category).toBe("stay");
  });
});

describe("pass partner slugs", () => {
  it("slugifies names", () => {
    expect(slugifyPartnerName("Harbour Hotel & Spa!")).toBe("harbour-hotel-spa");
    expect(slugifyPartnerName("Café Lumière")).toBe("cafe-lumiere");
    expect(slugifyPartnerName("!!!")).toBe("partner");
  });

  it("appends a unique hint", () => {
    expect(partnerSlugFor("Harbour Hotel", "abc123")).toBe("harbour-hotel-abc123");
    expect(partnerSlugFor("Harbour Hotel")).toBe("harbour-hotel");
  });

  it("validates slug shape", () => {
    expect(isPartnerSlug("harbour-hotel-abc123")).toBe(true);
    expect(isPartnerSlug("Harbour_Hotel")).toBe(false);
    expect(isPartnerSlug("")).toBe(false);
  });

  it("normalizes websites", () => {
    expect(normalizePartnerWebsite("example.com")).toBe("https://example.com");
    expect(normalizePartnerWebsite("http://example.com/x")).toBe("http://example.com/x");
    expect(normalizePartnerWebsite("  ")).toBe("");
    expect(isPartnerWebsite("")).toBe(true);
    expect(isPartnerWebsite("no spaces allowed.com/x y")).toBe(false);
  });
});

describe("pass partner profiles", () => {
  const goodProfile = {
    name: "Harbour Hotel",
    slug: "harbour-hotel-abc123",
    category: "stay",
    tagline: "Boutique stay by the water",
    description: "A 40-room boutique hotel.",
    website: "https://harbourhotel.com.au",
    ownerUid: "uid-1",
    status: "approved",
  };

  it("accepts a complete profile", () => {
    expect(validatePartnerProfile(goodProfile)).toEqual([]);
  });

  it("rejects bad slugs, categories, owners, and statuses", () => {
    expect(validatePartnerProfile({ ...goodProfile, slug: "Bad Slug!" })).toContain("Partner slug is invalid.");
    expect(validatePartnerProfile({ ...goodProfile, category: "airline" })).toContain(
      "Choose a valid business category.",
    );
    expect(validatePartnerProfile({ ...goodProfile, ownerUid: "" })).toContain("Owner is required.");
    expect(validatePartnerProfile({ ...goodProfile, status: "live" })).toContain("Partner status is invalid.");
    expect(isPartnerStatus("approved")).toBe(true);
    expect(isPartnerStatus("live")).toBe(false);
  });
});

describe("pass partner application transitions", () => {
  it("lets applicants withdraw but not self-approve", () => {
    expect(applicationApplicantCanTransition("submitted", "withdrawn")).toBe(true);
    expect(applicationApplicantCanTransition("under_review", "withdrawn")).toBe(true);
    expect(applicationApplicantCanTransition("submitted", "approved")).toBe(false);
    expect(applicationApplicantCanTransition("approved", "withdrawn")).toBe(false);
  });

  it("lets admins triage through review", () => {
    expect(applicationAdminCanTransition("submitted", "under_review")).toBe(true);
    expect(applicationAdminCanTransition("submitted", "approved")).toBe(true);
    expect(applicationAdminCanTransition("under_review", "rejected")).toBe(true);
    expect(applicationAdminCanTransition("rejected", "under_review")).toBe(true);
    expect(applicationAdminCanTransition("approved", "rejected")).toBe(false);
    expect(applicationAdminCanTransition("withdrawn", "approved")).toBe(false);
  });

  it("dispatches on actor role", () => {
    expect(applicationCanTransition("submitted", "withdrawn", "applicant")).toBe(true);
    expect(applicationCanTransition("submitted", "approved", "applicant")).toBe(false);
    expect(applicationCanTransition("submitted", "approved", "admin")).toBe(true);
  });
});

describe("pass partner offer links", () => {
  const goodLink = {
    partnerId: "p-1",
    badge: "15% Guest Perk",
    detail: "Show your Pass for 15% off food.",
    targetType: "place",
    targetId: "place-1",
  };

  it("accepts a well-formed offer link", () => {
    expect(validatePartnerOfferLink(goodLink)).toEqual([]);
  });

  it("rejects bad badges, details, and targets", () => {
    expect(validatePartnerOfferLink({ ...goodLink, badge: "" })).toContain("Offer badge is required.");
    expect(validatePartnerOfferLink({ ...goodLink, targetType: "banner" })).toContain("Offer target type is invalid.");
    expect(validatePartnerOfferLink({ ...goodLink, targetId: "" })).toContain("Offer target is invalid for its type.");
  });

  it("deep-links through the shared offer-target helper", () => {
    expect(partnerOfferHref({ targetType: "place", targetId: "place-1" })).toBe("/p/place-1");
    expect(partnerOfferHref({ targetType: "mate", targetId: "" })).toBe("/mate");
    expect(partnerOfferHref({ targetType: "place", targetId: "" })).toBe("");
  });
});

describe("demo pass partners", () => {
  it("ships at most 4 obviously-fake demo partners", () => {
    expect(DEMO_PASS_PARTNERS.length).toBeLessThanOrEqual(4);
    for (const p of DEMO_PASS_PARTNERS) {
      expect(p.name).toMatch(/^Demo /);
      expect(validatePartnerProfile({ ...p })).toEqual([]);
    }
  });
});
