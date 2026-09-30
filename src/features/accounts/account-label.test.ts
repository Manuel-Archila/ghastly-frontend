import { describe, expect, it } from "vitest";

import { accountLabel } from "./account-label";

describe("accountLabel", () => {
  it("leaves quetzal accounts as they are", () => {
    expect(accountLabel({ name: "BAC Monetaria", currency: "GTQ" })).toBe("BAC Monetaria");
  });
  it("adds the currency code to any other currency", () => {
    expect(accountLabel({ name: "BAC Visa", currency: "USD" })).toBe("BAC Visa · USD");
  });
});
