import { describe, expect, it } from "vitest";
import {
  addressLayoutFor,
  addressOk,
  composePhone,
  countryByCode,
  countryFlag,
  countryFromPhone,
  formatAddress,
  formatAddressOneLine,
  formatGps,
  isValidPhone,
  locationFromNominatim,
  parseAddress,
  splitPhone,
} from "./geo-address";

describe("host location", () => {
  it("formats live GPS the way hosts pin a property", () => {
    expect(formatGps(-33.8868, 151.1223)).toBe("-33.8868°, 151.1223°");
    expect(countryByCode("in")?.dial).toBe("+91");
    expect(addressLayoutFor("US").postalLabel).toBe("ZIP code");
    expect(addressLayoutFor("IN").postalLabel).toBe("PIN code");
  });

  it("maps a reverse-geocode payload to country, state, and city", () => {
    const loc = locationFromNominatim({
      lat: "-33.8868",
      lon: "151.1223",
      address: {
        country_code: "au",
        country: "Australia",
        state: "New South Wales",
        suburb: "Summer Hill",
        road: "Smith Street",
        house_number: "12",
      },
    });
    expect(loc.countryCode).toBe("AU");
    expect(loc.phoneCountryCode).toBe("+61");
    expect(loc.state).toBe("New South Wales");
    expect(loc.address).toMatch(/Smith Street/);
    expect(loc.geo).toEqual({ lat: -33.8868, lng: 151.1223 });
  });

  it("formats international address columns and E.164 phones", () => {
    expect(
      formatAddress({
        line1: "64 Argyle St",
        line2: "",
        city: "The Rocks",
        region: "NSW",
        postal: "2000",
        countryCode: "AU",
      }),
    ).toBe("64 Argyle St\nThe Rocks NSW 2000\nAustralia");
    expect(
      addressOk({
        line1: "64 Argyle St",
        line2: "",
        city: "The Rocks",
        region: "NSW",
        postal: "2000",
        countryCode: "AU",
      }),
    ).toBe(true);
    expect(composePhone("+61", "0412 345 678")).toBe("+61 412345678");
    expect(isValidPhone("+61 412345678")).toBe(true);
    expect(isValidPhone("0412 345 678")).toBe(false);
    expect(splitPhone("+44 2079460958")).toEqual({ dial: "+44", national: "2079460958" });
  });

  it("resolves newly approved markets by code and dial prefix", () => {
    expect(countryByCode("IN")?.dial).toBe("+91");
    expect(countryByCode("ph")?.dial).toBe("+63");
    expect(countryByCode("np")?.name).toBe("Nepal");
    expect(splitPhone("+919876543210")).toEqual({ dial: "+91", national: "9876543210" });
    expect(splitPhone("+6591234567")).toEqual({ dial: "+65", national: "91234567" });
    expect(isValidPhone("+919876543210")).toBe(true);
  });

  it("converts country codes to flag emojis and detects country from phone", () => {
    expect(countryFlag("AU")).toBe("🇦🇺");
    expect(countryFlag("IN")).toBe("🇮🇳");
    expect(countryFlag("US")).toBe("🇺🇸");
    expect(countryFlag("GB")).toBe("🇬🇧");
    expect(countryFlag("")).toBe("🌐");

    expect(countryFromPhone("+61412345678")?.code).toBe("AU");
    expect(countryFromPhone("+919876543210")?.code).toBe("IN");
    expect(countryFromPhone("+15551234567")?.dial).toBe("+1");
    expect(countryFromPhone("+447911123456")?.code).toBe("GB");
    expect(countryFromPhone("+34912345678")?.code).toBe("ES");
    expect(countryFromPhone("+390612345678")?.code).toBe("IT");
    expect(countryFromPhone("+5511999999999")?.code).toBe("BR");
  });
});

describe("parseAddress", () => {
  it("splits a lone locality line into city, state and postcode", () => {
    expect(parseAddress("Sydney NSW 2000")).toMatchObject({
      line1: "",
      city: "Sydney",
      region: "NSW",
      postal: "2000",
    });
  });

  it("keeps the street part of a comma-joined locality line", () => {
    expect(parseAddress("61 Albion St, Surry Hills NSW 2010")).toMatchObject({
      line1: "61 Albion St",
      city: "Surry Hills",
      region: "NSW",
      postal: "2010",
    });
  });

  it("round-trips a stored multi-line address", () => {
    const stored = formatAddress({
      line1: "61 Albion St",
      line2: "",
      city: "Surry Hills",
      region: "NSW",
      postal: "2010",
      countryCode: "AU",
    });
    expect(parseAddress(stored)).toMatchObject({
      line1: "61 Albion St",
      city: "Surry Hills",
      region: "NSW",
      postal: "2010",
    });
  });

  it("treats a plain street line with no locality markers as street", () => {
    expect(parseAddress("61 Albion Street")).toMatchObject({
      line1: "61 Albion Street",
      city: "",
      region: "",
      postal: "",
    });
  });

  it("drops a duplicated locality line instead of treating it as street", () => {
    expect(parseAddress("Sydney NSW 2000\nSydney NSW 2000\nAustralia")).toMatchObject({
      line1: "",
      city: "Sydney",
      region: "NSW",
      postal: "2000",
    });
    expect(formatAddress(parseAddress("Sydney NSW 2000\nSydney NSW 2000\nAustralia"))).toBe(
      "Sydney NSW 2000\nAustralia",
    );
  });

  it("keeps a real street line above the locality", () => {
    expect(parseAddress("1 Test St\nSydney NSW 2000\nAustralia")).toMatchObject({
      line1: "1 Test St",
      city: "Sydney",
      region: "NSW",
      postal: "2000",
    });
  });

  it("keeps a street name that starts with the city", () => {
    expect(parseAddress("Sydney Opera House\nSydney NSW 2000\nAustralia")).toMatchObject({
      line1: "Sydney Opera House",
      city: "Sydney",
      region: "NSW",
      postal: "2000",
    });
  });

  it("round-trips the de-duplicated address without change", () => {
    const once = formatAddress(parseAddress("Sydney NSW 2000\nSydney NSW 2000\nAustralia"));
    expect(formatAddress(parseAddress(once))).toBe(once);
  });

  it("formats a single display line without duplicated locality", () => {
    expect(formatAddressOneLine("Sydney NSW 2000\nSydney NSW 2000\nAustralia")).toBe("Sydney NSW 2000, Australia");
    expect(formatAddressOneLine("1 Test St\nSydney NSW 2000\nAustralia")).toBe("1 Test St, Sydney NSW 2000, Australia");
    expect(formatAddressOneLine("")).toBe("");
  });

  it("returns an empty address for blank input", () => {
    expect(parseAddress("")).toMatchObject({ line1: "", city: "", region: "", postal: "" });
    expect(parseAddress(null)).toMatchObject({ line1: "", city: "", region: "", postal: "" });
  });
});
