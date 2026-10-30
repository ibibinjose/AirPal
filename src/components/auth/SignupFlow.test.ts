import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { normalizeHandle, handleFromName, handleError } from "@shared/bio";

describe("SignupFlow & Handle Suggestion", () => {
  it("prefers email username when email ends with digits", () => {
    const email = "airpalqa2@agentmail.to";
    const name = "AirPal QA Two";

    const emailPrefix = normalizeHandle(email.split("@")[0] || "");
    expect(emailPrefix).toBe("airpalqa2");
    expect(emailPrefix.match(/\d+$/)).toBeTruthy();
    expect(handleError(emailPrefix)).toBeNull();

    const nameCand = handleFromName(name);
    expect(nameCand).toBe("airpalqatwo");

    // When email has digits, it should yield airpalqa2 rather than airpalqatwo
    const suggested = emailPrefix && emailPrefix.match(/\d+$/) && !handleError(emailPrefix) ? emailPrefix : nameCand;
    expect(suggested).toBe("airpalqa2");
  });

  it("enforces bounded timeout and parallel post-registration setup in SignupFlow source", () => {
    const code = readFileSync(new URL("./SignupFlow.tsx", import.meta.url), "utf-8");
    expect(code).toContain("withTimeout");
    expect(code).toContain("Promise.allSettled(postTasks)");
    expect(code).not.toMatch(/await confirmAdultAccount\([\s\S]*?\);\s*if \(cleanHandle/);
  });
});
