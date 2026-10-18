import { describe, expect, it } from "vitest";
import { friendlyFunctionError } from "./functions";
import { friendlyBirthdayError } from "./birthday-freebies";
import { friendlyPromotionError } from "./promotions";

function coded(code: string, message = "") {
  const err = new Error(message) as Error & { code: string };
  err.code = code;
  return err;
}

describe("friendlyFunctionError", () => {
  it("maps shared callable codes", () => {
    expect(friendlyFunctionError(coded("functions/permission-denied"))).toBe(
      "You do not have permission for that action.",
    );
    expect(friendlyFunctionError(coded("unauthenticated"))).toBe("Sign in to continue.");
    expect(friendlyFunctionError(new Error("boom"))).toBe("boom");
    expect(friendlyFunctionError({})).toBe("Something went wrong. Please try again.");
  });

  it("prefers the server message, then per-surface wording", () => {
    expect(friendlyFunctionError(coded("functions/failed-precondition", "Closed"))).toBe("Closed");
    expect(friendlyFunctionError(coded("failed-precondition"))).toBe("This action is not available right now.");
    expect(friendlyFunctionError(coded("failed-precondition"), { preconditionMessage: "Not open." })).toBe("Not open.");
    expect(friendlyFunctionError(coded("invalid-argument"))).toBe("Check the details and try again.");
  });
});

describe("delegate parity", () => {
  it("birthday keeps its wording through the shared helper", () => {
    expect(friendlyBirthdayError(coded("functions/unauthenticated"))).toBe("Sign in to continue.");
    expect(friendlyBirthdayError(coded("invalid-argument"))).toBe("Check the details and try again.");
    expect(friendlyBirthdayError(new Error("x"))).toBe("x");
  });

  it("promotions keeps its campaign wording through the shared helper", () => {
    expect(friendlyPromotionError(coded("functions/failed-precondition"))).toBe("This campaign is not open right now.");
    expect(friendlyPromotionError(coded("failed-precondition", "Paused"))).toBe("Paused");
    expect(friendlyPromotionError(coded("permission-denied"))).toBe("You do not have permission for that action.");
  });
});
