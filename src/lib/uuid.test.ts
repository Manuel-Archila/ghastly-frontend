import { describe, expect, it } from "vitest";
import { uuidv7 } from "./uuid";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("uuidv7", () => {
  it("matches the UUIDv7 shape (version 7, RFC 4122 variant)", () => {
    expect(uuidv7()).toMatch(UUID_PATTERN);
  });

  it("generates unique values", () => {
    const ids = new Set(Array.from({ length: 1000 }, () => uuidv7()));
    expect(ids.size).toBe(1000);
  });

  it("sorts lexicographically in the order generated (time-ordered)", async () => {
    const first = uuidv7();
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = uuidv7();
    expect(first < second).toBe(true);
  });
});
